import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Chess from 'chess.js';
import Chessboard from 'chessboardjsx';
import GameData from './GameData.js';
import FenInput from './components/customization/FenInput.js';
import wm from "./icons/pieces/fairy/wk_180.svg"; // "mann" (upside-down king)
import bm from "./icons/pieces/fairy/bk_180.svg";
import wf from "./icons/pieces/fairy/wb_180.svg"; // "ferz" (upside-down bishop)
import bf from "./icons/pieces/fairy/bb_180.svg";
import wd from "./icons/pieces/fairy/wn_180.svg"; // "night rider" (upside-down knight)
import bd from "./icons/pieces/fairy/bn_180.svg";
import we from "./icons/pieces/fairy/we.svg"; // "empress" (knight/rook combo)
import be from "./icons/pieces/fairy/be.svg"; // "empress"
import ws from "./icons/pieces/fairy/ws.svg"; // "princess" (knight/bishop combo)
import bs from "./icons/pieces/fairy/bs.svg"; // "princess"
import wj from "./icons/white_joker.svg"; //
import bj from "./icons/black_joker.svg";


import './variant-style.css';

class HumanVsHuman extends Component {
  static propTypes = { children: PropTypes.func };

  state = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn: '',
    squareStyles: {}, // custom square styles
    fromSquare: '', // most recently clicked square (empty if a move was just made)
    turn: '',
    gameOver: false,
    gameResult: '', // checkmate, stalemate, insufficient material, ...
  };

  componentDidMount() {
    this.game = new Chess(this.props.fen || this.state.fen, this.props.variant, { c: { 0: [-18, -33, -31, -14,  18, 33, 31,  14], 1: [] } });
    // initialize the internal game
    this.setState({
      fen: this.game.fen(),
      turn: this.game.turn(),
    });
    this.updateGameResult(); // in case the FEN string gives an ending position
  }

  componentDidUpdate(prevProps) {
    // get rid of old square-selection information if the user leaves cursor mode
    if (this.props.editMode && this.props.sparePiece !== 'cursor' && prevProps.sparePiece === 'cursor') {
      this.setState({
        squareStyles: {},
        fromSquare: ''
      });
    }
    // not totally necessary, but if we didn't do this, then
    // (a) one square would still be highlighted after the user de-selects the cursor
    // (b) the fromSquare would still be set, so the user could move the selected piece
    // after re-entering cursor mode
  }

  // adjust board size according to window size
  calcWidth = (dimensions) => {
    let customWidth = Math.min(540/640 * dimensions.screenWidth, 540/640 * dimensions.screenHeight);
    return (dimensions.screenWidth < 640 || dimensions.screenHeight < 640) ? customWidth : 540;
  }

  // highlight hint squares
  highlightSquare = (hintSquares) => {
    const highlightStyles = [...hintSquares].reduce(
      (a, c) => ({
        ...a,
        ...{
          [c]: {
            background:
                'radial-gradient(circle, rgba(255, 120, 12, 0.67), 50%, transparent 10%)',
            borderRadius: '50%',
          },
        },
      }),
      {},
    );
    // show hints
    this.setState(({ squareStyles }) => ({
      squareStyles: { ...squareStyles, ...highlightStyles },
    }));
  };

  updateGameResult() {
    if (this.game.game_over()) {
      let result; // fifty move rule
      if (this.game.in_checkmate()) {
        result = "checkmate";
      }
      else if (this.props.variant === 3 && this.game.extinguished()) {
        result = 'extinction';
      }
      else if (this.game.in_stalemate()) {
        result = "stalemate";
      }
      else if (this.game.insufficient_material()) {
        result = "insufficient";
      }
      else if (this.game.in_threefold_repetition()) {
        result = "repetition";
      }
      else {
        result = 'fifty';
      }
      this.setState({
        gameOver: true,
        gameResult: result
      });
    }
    /* (we will pass the value of this.state.gameResult to GameData) */
  }

  onSquareClick = (square) => {
    if (!this.props.editMode) {
    // disable user input if game is over
      if (this.state.gameOver) return;

      // highlight the square you just clicked
      this.setState(() => ({
        squareStyles: { [square]: { backgroundColor: '#38f' } },
        fromSquare: square,
      }));

      // get list of possible moves for the piece on this square
      // (returns empty array if there are no possible moves or there is no piece)
      const moves = this.game.moves({
        square,
        verbose: true,
      });

      // highlight the destination square of every possible move, moves[i].to
      const hintSquares = moves.map(move => move.to);
      this.highlightSquare(hintSquares);

      // process the case where the user has registered a move by clicking
      const move = this.game.move({
        from: this.state.fromSquare,
        to: square,
        promotion: 'q', // always promote to a queen for example simplicity
        // fix this so the user can choose what to promote to
      });

      // illegal move
      if (move === null) return;

      // legal move, so update the game state
      this.setState({
        fen: this.game.fen(),
        pgn: this.game.pgn(),
        fromSquare: '',
        turn: this.game.turn(),
      });

      // end the game if necessary
      this.updateGameResult();
    }
    else { // edit mode
      if (this.props.sparePiece !== 'cursor') {
        // if the selected square is not empty
        if (this.game.get(square)) {
          if (this.props.sparePiece === 'trash') { // if trash icon is selected, delete piece on selected square
            this.game.remove(square);
            this.setState({
              fen: this.game.fen()
            });
          }
        }
        else { // place the selected spare piece on the selected square if the selected square is empty
          const type = this.props.sparePiece.toLowerCase(); 
          const color = this.props.sparePiece === this.props.sparePiece.toLowerCase() ? 'b' : 'w';
          this.game.put({ type: type, color: color }, square);
          this.setState({
            fen: this.game.fen()
          });
        }
      }
      else {
        // do nothing if the person clicked on the same square twice
        if (this.state.fromSquare === square) {
          return;
        }

        // highlight clicked square, and update the from square
        this.setState({
          squareStyles: { [square]: { backgroundColor: '#68f' } },
          fromSquare: square,
        });

        // get just selected piece if it exists
        const piece = this.game.get(this.state.fromSquare);

        if (piece === null) return;

        // displace the selected piece on the board
        this.game.remove(this.state.fromSquare);
        this.game.put(piece, square);

        // update the fen, and empty out the from square
        this.setState({
          fen: this.game.fen(),
          fromSquare: '',
        });
      }
    }
  };

  // When right clicking, we preserve the old squareStyles (we merely append the new style).
  // This will allow the user to have multiple squares be highlighted simultaneously,
  // for whatever reason (annotation?)
  onSquareRightClick = (square) => {
    if (!this.props.editMode) 
      this.setState(({ squareStyles }) => ({
        squareStyles: { ...squareStyles, [square]: { backgroundColor: '#e86c65' } },
      }));
  };

  render() {
    const { fen, pgn, turn, gameResult, squareStyles } = this.state;
    return this.props.children({
      squareStyles,
      fen,
      pgn,
      turn,
      gameResult,
      onSquareClick: this.onSquareClick,
      onSquareRightClick: this.onSquareRightClick,
      calcWidth: this.calcWidth,
    });
  }
}

export default function WithMoveValidation(start_fen, variant=0, showData=true, smallBoard=false, editMode=false, sparePiece) {
  let boardId = variant === 2 ? "grid-board" : "false"; // if variant isn't grid chess, boardId will be set to false
  return (
    <div>
      <HumanVsHuman fen={start_fen} variant={variant} editMode={editMode} sparePiece={sparePiece}>
        { /* HumanVsHuman calls the following function as this.props.children() in its render() method */ }
        {({
          squareStyles,
          fen,
          pgn,
          gameResult,
          turn,
          onSquareClick,
          onSquareRightClick,
          calcWidth
        }) => {
          // redefine calcWidth() if smallBoard arg is true
          if (smallBoard) {
            calcWidth = (dimensions) => {
              let customWidth = Math.min(384/460 * dimensions.screenWidth, 384/460 * dimensions.screenHeight);
              return (dimensions.screenWidth < 460 || dimensions.screenHeight < 460) ? customWidth : 384;
            }
          }

          const gameData =
            showData ? (
              <div className="p-1">
                <GameData pgn={pgn} turn={turn} gameResult={gameResult} />
              </div>
            ) :
            null;

          let customPieces = {
            wM: ({ squareWidth }) => (
              <img
                style={{
                  width: squareWidth,
                  height: squareWidth,
                }}
                src={wm}
                alt="white mann"
              />
            ),
            bM: ({ squareWidth }) => (
              <img
                style={{
                  width: squareWidth,
                  height: squareWidth,
                }}
                src={bm}
                alt="black mann"
              />
            ),

            wD: ({ squareWidth }) => (
              <img
                style={{
                  width: squareWidth,
                  height: squareWidth,
                }}
                src={wd}
                alt="white nightrider"
              />
            ),
            bD: ({ squareWidth }) => (
              <img
                style={{
                  width: squareWidth,
                  height: squareWidth,
                }}
                src={bd}
                alt="black nightrider"
              />
            ),
            wF: ({ squareWidth }) => (
              <img
                style={{
                  width: squareWidth,
                  height: squareWidth,
                }}
                src={wf}
                alt="white ferz"
              />
            ),
            bF: ({ squareWidth }) => (
              <img
                style={{
                  width: squareWidth,
                  height: squareWidth,
                }}
                src={bf}
                alt="black ferz"
              />
            ),
            wE: ({ squareWidth }) => (
              <img
                style={{
                  width: squareWidth,
                  height: squareWidth,
                }}
                src={we}
                alt="white empress"
              />
            ),
            bE: ({ squareWidth }) => (
              <img
                style={{
                  width: squareWidth,
                  height: squareWidth,
                }}
                src={be}
                alt="black empress"
              />
            ),
            wS: ({ squareWidth }) => (
              <img
                style={{
                  width: squareWidth,
                  height: squareWidth,
                }}
                src={ws}
                alt="white princess"
              />
            ),
            bS: ({ squareWidth }) => (
              <img
                style={{
                  width: squareWidth,
                  height: squareWidth,
                }}
                src={bs}
                alt="black princess"
              />
            ),

            wC: ({ squareWidth }) => (
              <img
                style={{
                  width: squareWidth,
                  height: squareWidth,
                }}
                src={wj}
                alt="white joker"
              />
            ),
            bC: ({ squareWidth }) => (
              <img
                style={{
                  width: squareWidth,
                  height: squareWidth,
                }}
                src={bj}
                alt="black joker"
              />
            ),
          }

          // for antichess, replace king with flipped king
          if (variant === 1) {
            customPieces = {...customPieces, ...{
              wK: ({ squareWidth }) => (
                <img
                  style={{
                    width: squareWidth,
                    height: squareWidth,
                  }}
                  src={wm}
                  alt="white mann"
                />
              ),
              bK: ({ squareWidth }) => (
                <img
                  style={{
                    width: squareWidth,
                    height: squareWidth,
                  }}
                  src={bm}
                  alt="black mann"
                />
              ),
            }}
          }

          return (
            <div className="d-flex flex-column">
              { editMode ? <FenInput fen={fen}/> : null }
              <div id={boardId}>
                <Chessboard
                  position={fen}
                  boardStyle={{
                      borderRadius: '5px',
                      boxShadow: '0 2px 3px rgba(0, 0, 0, 0.5)',
                  }}
                  pieces={customPieces}
                  lightSquareStyle={{ backgroundColor: '#ffffff' }}
                  darkSquareStyle={{ backgroundColor: '#65cae8' }}
                  squareStyles={squareStyles}
                  onSquareClick={onSquareClick}
                  onSquareRightClick={onSquareRightClick}
                  calcWidth={calcWidth}
                  draggable={false}
                />
              </div>
              { gameData }
            </div>
          );
        }}
      </HumanVsHuman>
    </div>
  );
}
