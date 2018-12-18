/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { select, selectReduce } = require('./state');

// Only needed to shuffle some modifier keys for Apple keyboards as per vector editing software conventions,
// so it's OK that user agent strings are not reliable; in case it's spoofed, it'll just work with a slightly
// different modifier key map (also, there aren't a lot of alternatives for OS / hw / keyboard detection).
// It shouldn't fail in testing environments (node.js) either, where it can just return false, no need for
// actually getting the OS on the server side.
const appleKeyboard = Boolean(
  window &&
    window.navigator &&
    window.navigator.userAgent &&
    window.navigator.userAgent.match('Macintosh|iPhone|iPad')
);

/**
 * Selectors directly from a state object
 *
 *    (we could turn gesture.js into a factory, with this state root - primaryUpdate - being passed...)
 */

const primaryUpdate = state => state.primaryUpdate;

/**
 * Gestures - derived selectors for transient state
 */

// dispatch the various types of actions
const rawCursorPosition = select(action =>
  action.type === 'cursorPosition' ? action.payload : null
)(primaryUpdate);

const mouseButtonEvent = select(action => (action.type === 'mouseEvent' ? action.payload : null))(
  primaryUpdate
);

const keyFromMouse = select(({ type, payload: { altKey, metaKey, shiftKey, ctrlKey } }) =>
  type === 'cursorPosition' || type === 'mouseEvent' ? { altKey, metaKey, shiftKey, ctrlKey } : {}
)(primaryUpdate);

const metaHeld = select(appleKeyboard ? e => e.metaKey : e => e.altKey)(keyFromMouse);
const optionHeld = select(appleKeyboard ? e => e.altKey : e => e.ctrlKey)(keyFromMouse);
const shiftHeld = select(e => e.shiftKey)(keyFromMouse);

const cursorPosition = selectReduce((previous, position) => position || previous, { x: 0, y: 0 })(
  rawCursorPosition
);

const mouseButton = selectReduce(
  (prev, next) => {
    if (!next) {
      return prev;
    }
    const { event, uid } = next;
    if (event === 'mouseDown') {
      return { down: true, uid };
    } else {
      return event === 'mouseUp' ? { down: false, uid } : prev;
    }
  },
  { down: false, uid: null }
)(mouseButtonEvent);

const mouseIsDown = selectReduce(
  (previous, next) => (next ? next.event === 'mouseDown' : previous),
  false
)(mouseButtonEvent);

const gestureEnd = select(
  action =>
    action &&
    (action.type === 'actionEvent' ||
      (action.type === 'mouseEvent' && action.payload.event === 'mouseUp'))
)(primaryUpdate);

/**
 * mouseButtonStateTransitions
 *
 *    View: http://stable.ascii-flow.appspot.com/#567671116534197027
 *    Edit: http://stable.ascii-flow.appspot.com/#567671116534197027/776257435
 *
 *
 *                             mouseIsDown
 *        initial state: 'up' +-----------> 'downed'
 *                        ^ ^                 +  +
 *                        | |  !mouseIsDown   |  |
 *           !mouseIsDown | +-----------------+  | mouseIsDown && movedAlready
 *                        |                      |
 *                        +----+ 'dragging' <----+
 *                                +      ^
 *                                |      |
 *                                +------+
 *                               mouseIsDown
 *
 */
const mouseButtonStateTransitions = (state, mouseIsDown, movedAlready) => {
  switch (state) {
    case 'up':
      return mouseIsDown ? 'downed' : 'up';
    case 'downed':
      if (mouseIsDown) {
        return movedAlready ? 'dragging' : 'downed';
      } else {
        return 'up';
      }

    case 'dragging':
      return mouseIsDown ? 'dragging' : 'up';
  }
};

const mouseButtonState = selectReduce(
  ({ buttonState, downX, downY }, mouseIsDown, { x, y }) => {
    const movedAlready = x !== downX || y !== downY;
    const newButtonState = mouseButtonStateTransitions(buttonState, mouseIsDown, movedAlready);
    return {
      buttonState: newButtonState,
      downX: newButtonState === 'downed' ? x : downX,
      downY: newButtonState === 'downed' ? y : downY,
    };
  },
  { buttonState: 'up', downX: null, downY: null }
)(mouseIsDown, cursorPosition);

const mouseDowned = select(state => state.buttonState === 'downed')(mouseButtonState);

const dragging = select(state => state.buttonState === 'dragging')(mouseButtonState);

const dragVector = select(({ buttonState, downX, downY }, { x, y }) => ({
  down: buttonState !== 'up',
  x0: downX,
  y0: downY,
  x1: x,
  y1: y,
}))(mouseButtonState, cursorPosition);

const actionEvent = select(action => (action.type === 'actionEvent' ? action.payload : null))(
  primaryUpdate
);

module.exports = {
  actionEvent,
  dragging,
  dragVector,
  cursorPosition,
  gestureEnd,
  metaHeld,
  mouseButton,
  mouseDowned,
  mouseIsDown,
  optionHeld,
  shiftHeld,
};
