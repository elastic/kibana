/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { scene } from './common';
import { select } from './select';

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

const gestureStatePrev = select(scene => scene.gestureState)(scene);

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

export const metaHeld = select(appleKeyboard ? e => e.metaKey : e => e.altKey)(keyFromMouse);
export const optionHeld = select(appleKeyboard ? e => e.altKey : e => e.ctrlKey)(keyFromMouse);
export const shiftHeld = select(e => e.shiftKey)(keyFromMouse);

export const cursorPosition = select(({ cursor }, position) => position || cursor)(
  gestureStatePrev,
  rawCursorPosition
);

export const mouseButton = select(next => {
  if (!next) {
    return { down: false, uid: null };
  }
  const { event, uid } = next;
  if (event === 'mouseDown') {
    return { down: true, uid };
  } else {
    return event === 'mouseUp' ? { down: false, uid } : { down: false, uid: null };
  }
})(mouseButtonEvent);

export const mouseIsDown = select(({ mouseIsDown }, next) =>
  next ? next.event === 'mouseDown' : mouseIsDown
)(gestureStatePrev, mouseButtonEvent);

export const gestureEnd = select(
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
 *                             mouseNowDown
 *        initial state: 'up' +------------> 'downed'
 *                        ^ ^                  +  +
 *                        | |  !mouseNowDown   |  |
 *          !mouseNowDown | +------------------+  | mouseNowDown && movedAlready
 *                        |                       |
 *                        +----+ 'dragging' <-----+
 *                                +      ^
 *                                |      |
 *                                +------+
 *                               mouseNowDown
 *
 */
const mouseButtonStateTransitions = (state, mouseNowDown, movedAlready) => {
  switch (state) {
    case 'up':
      return mouseNowDown ? 'downed' : 'up';
    case 'downed':
      if (mouseNowDown) {
        return movedAlready ? 'dragging' : 'downed';
      } else {
        return 'up';
      }

    case 'dragging':
      return mouseNowDown ? 'dragging' : 'up';
  }
};

const mouseButtonState = select(
  ({ mouseButtonState: { buttonState, downX, downY } }, mouseNowDown, { x, y }) => {
    const movedAlready = x !== downX || y !== downY;
    const newButtonState = mouseButtonStateTransitions(buttonState, mouseNowDown, movedAlready);
    return {
      buttonState: newButtonState,
      downX: newButtonState === 'downed' ? x : downX,
      downY: newButtonState === 'downed' ? y : downY,
    };
  }
)(gestureStatePrev, mouseIsDown, cursorPosition);

export const mouseDowned = select(state => state.buttonState === 'downed')(mouseButtonState);

export const dragging = select(state => state.buttonState === 'dragging')(mouseButtonState);

export const dragVector = select(({ buttonState, downX, downY }, { x, y }) => ({
  down: buttonState !== 'up',
  x0: downX,
  y0: downY,
  x1: x,
  y1: y,
}))(mouseButtonState, cursorPosition);

export const actionEvent = select(action =>
  action.type === 'actionEvent' ? action.payload : null
)(primaryUpdate);

export const gestureState = select((cursor, mouseIsDown, mouseButtonState) => ({
  cursor,
  mouseIsDown,
  mouseButtonState,
}))(cursorPosition, mouseIsDown, mouseButtonState);
