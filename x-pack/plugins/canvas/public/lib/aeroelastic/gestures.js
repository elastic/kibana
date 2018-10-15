/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { select, selectReduce } = require('./state');

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
const rawCursorPosition = select(
  action => (action.type === 'cursorPosition' ? action.payload : null)
)(primaryUpdate);

const mouseButtonEvent = select(action => (action.type === 'mouseEvent' ? action.payload : null))(
  primaryUpdate
);

const keyboardEvent = select(action => (action.type === 'keyboardEvent' ? action.payload : null))(
  primaryUpdate
);

const keyInfoFromMouseEvents = select(
  ({ type, payload: { altKey, metaKey, shiftKey } }) =>
    type === 'cursorPosition' || type === 'mouseEvent' ? { altKey, metaKey, shiftKey } : null
)(primaryUpdate);

const altTest = key => key.slice(0, 3).toLowerCase() === 'alt' || key === 'KeyALT';
const metaTest = key => key.slice(0, 4).toLowerCase() === 'meta';
const shiftTest = key => key === 'KeySHIFT' || key.slice(0, 5) === 'Shift';
const deadKey1 = 'KeyDEAD';
const deadKey2 = 'Key†';

// Key states (up vs down) from keyboard events are trivially only captured if there's a keyboard event, and that only
// happens if the user is interacting with the browser, and specifically, with the DOM subset that captures the keyboard
// event. It's also clear that all keys, and importantly, modifier keys (alt, meta etc.) can alter state while the user
// is not sending keyboard DOM events to the browser, eg. while using another tab or application. Similarly, an alt-tab
// switch away from the browser will cause the registration of an `Alt down`, but not an `Alt up`, because that happens
// in the switched-to application (https://github.com/elastic/kibana-canvas/issues/901).
//
// The solution is to also harvest modifier key (and in the future, maybe other key) statuses from mouse events, as these
// modifier keys typically alter behavior while a pointer gesture is going on, in this case now, relaxing or tightening
// snapping behavior. So we simply toggle the current key set up/down status (`lookup`) opportunistically.
//
// This function destructively modifies lookup, but could be made to work on immutable structures in the future.
const updateKeyLookupFromMouseEvent = (lookup, keyInfoFromMouseEvent) => {
  Object.entries(keyInfoFromMouseEvent).forEach(([key, value]) => {
    if (metaTest(key)) {
      if (value) lookup.meta = true;
      else delete lookup.meta;
    }
    if (altTest(key)) {
      if (value) lookup.alt = true;
      else delete lookup.alt;
    }
    if (shiftTest(key)) {
      if (value) lookup.shift = true;
      else delete lookup.shift;
    }
  });
  return lookup;
};

const pressedKeys = selectReduce((prevLookup, next, keyInfoFromMouseEvent) => {
  const lookup = keyInfoFromMouseEvent
    ? updateKeyLookupFromMouseEvent(prevLookup, keyInfoFromMouseEvent)
    : prevLookup;
  // these weird things get in when we alt-tab (or similar) etc. away and get back later:
  delete lookup[deadKey1];
  delete lookup[deadKey2];
  if (!next) return { ...lookup };

  let code = next.code;
  if (altTest(next.code)) code = 'alt';

  if (metaTest(next.code)) code = 'meta';

  if (shiftTest(next.code)) code = 'shift';

  if (next.event === 'keyDown') {
    return { ...lookup, [code]: true };
  } else {
    /*eslint no-unused-vars: ["error", { "ignoreRestSiblings": true }]*/
    const { [code]: ignore, ...rest } = lookup;
    return rest;
  }
}, {})(keyboardEvent, keyInfoFromMouseEvents);

const keyUp = select(keys => Object.keys(keys).length === 0)(pressedKeys);

const metaHeld = select(lookup => Boolean(lookup.meta))(pressedKeys);
const optionHeld = select(lookup => Boolean(lookup.alt))(pressedKeys);
const shiftHeld = select(lookup => Boolean(lookup.shift))(pressedKeys);

const cursorPosition = selectReduce((previous, position) => position || previous, { x: 0, y: 0 })(
  rawCursorPosition
);

const mouseButton = selectReduce(
  (prev, next) => {
    if (!next) return prev;
    const { event, uid } = next;
    if (event === 'mouseDown') return { down: true, uid };
    else return event === 'mouseUp' ? { down: false, uid } : prev;
  },
  { down: false, uid: null }
)(mouseButtonEvent);

const mouseIsDown = selectReduce(
  (previous, next) => (next ? next.event === 'mouseDown' : previous),
  false
)(mouseButtonEvent);

const gestureEnd = selectReduce(
  (prev, keyUp, mouseIsDown) => {
    const inAction = !keyUp || mouseIsDown;
    const ended = !inAction && prev.inAction;
    return { ended, inAction };
  },
  {
    ended: false,
    inAction: false,
  },
  d => d.ended
)(keyUp, mouseIsDown);

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
      if (mouseIsDown) return movedAlready ? 'dragging' : 'downed';
      else return 'up';

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

module.exports = {
  dragging,
  dragVector,
  cursorPosition,
  gestureEnd,
  metaHeld,
  mouseButton,
  mouseDowned,
  mouseIsDown,
  optionHeld,
  pressedKeys,
  shiftHeld,
};
