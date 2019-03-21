/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const localMousePosition = (canvasOrigin, clientX, clientY) => {
  const { left, top } = canvasOrigin();
  return {
    x: clientX - left,
    y: clientY - top,
  };
};

const resetHandler = () => {
  window.onmousemove = null;
  window.onmouseup = null;
};

const setupHandler = (commit, canvasOrigin, initialCallback, initialClientX, initialClientY) => {
  // Ancestor has to be identified on setup, rather than 1st interaction, otherwise events may be triggered on
  // DOM elements that had been removed: kibana-canvas github issue #1093

  window.onmousemove = ({ buttons, clientX, clientY, altKey, metaKey, shiftKey, ctrlKey }) => {
    const { x, y } = localMousePosition(canvasOrigin, clientX, clientY);
    // only commits the cursor position if there's a way to latch onto x/y calculation (canvasOrigin is knowable)
    // or if left button is being held down (i.e. an element is being dragged)
    if (buttons === 1 || canvasOrigin) {
      commit('cursorPosition', { x, y, altKey, metaKey, shiftKey, ctrlKey });
    } else {
      // clears cursorPosition
      commit('cursorPosition', {});
    }
  };
  window.onmouseup = e => {
    e.stopPropagation();
    const { clientX, clientY, altKey, metaKey, shiftKey, ctrlKey } = e;
    const { x, y } = localMousePosition(canvasOrigin, clientX, clientY);
    commit('mouseEvent', { event: 'mouseUp', x, y, altKey, metaKey, shiftKey, ctrlKey });
    resetHandler();
  };
  if (typeof initialCallback === 'function' && !isNaN(initialClientX) && !isNaN(initialClientY)) {
    const { x, y } = localMousePosition(canvasOrigin, initialClientX, initialClientY);
    initialCallback(x, y);
  }
};

const handleMouseMove = (
  commit,
  { clientX, clientY, altKey, metaKey, shiftKey, ctrlKey },
  isEditable,
  canvasOrigin
) => {
  // mouse move must be handled even before an initial click
  if (!window.onmousemove && isEditable) {
    setupHandler(
      commit,
      canvasOrigin,
      (x, y) => commit('cursorPosition', { x, y, altKey, metaKey, shiftKey, ctrlKey }),
      clientX,
      clientY
    );
  }
};

const handleWheel = (
  commit,
  { clientX, clientY, altKey, metaKey, shiftKey, ctrlKey },
  isEditable,
  canvasOrigin
) => {
  // new mouse position must be registered when page scrolls
  if (isEditable) {
    setupHandler(
      commit,
      canvasOrigin,
      (x, y) => commit('cursorPosition', { x, y, altKey, metaKey, shiftKey, ctrlKey }),
      clientX,
      clientY
    );
  }
};

const handleMouseDown = (commit, e, isEditable, canvasOrigin) => {
  e.stopPropagation();
  const { clientX, clientY, buttons, altKey, metaKey, shiftKey, ctrlKey } = e;
  if (buttons !== 1 || !isEditable) {
    resetHandler();
    return; // left-click and edit mode only
  }
  setupHandler(
    commit,
    canvasOrigin,
    (x, y) =>
      commit('mouseEvent', { event: 'mouseDown', x, y, altKey, metaKey, shiftKey, ctrlKey }),
    clientX,
    clientY
  );
};

export const eventHandlers = {
  onMouseDown: props => e => handleMouseDown(props.commit, e, props.isEditable, props.canvasOrigin),
  onMouseMove: props => e => handleMouseMove(props.commit, e, props.isEditable, props.canvasOrigin),
  onWheel: props => e => handleWheel(props.commit, e, props.isEditable, props.canvasOrigin),
  resetHandler: () => () => resetHandler(),
};
