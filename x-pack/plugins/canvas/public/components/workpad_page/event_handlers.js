/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { withHandlers } from 'recompose';

const ancestorElement = element => {
  if (!element) return element;
  // IE11 has no classList on SVG elements, but we're not interested in SVG elements
  do if (element.classList && element.classList.contains('canvasPage')) return element;
  while ((element = element.parentElement || element.parentNode)); // no IE11 SVG parentElement
};

const localMousePosition = (box, clientX, clientY) => {
  return {
    x: clientX - box.left,
    y: clientY - box.top,
  };
};

const resetHandler = () => {
  window.onmousemove = null;
  window.onmouseup = null;
};

const setupHandler = (commit, target) => {
  // Ancestor has to be identified on setup, rather than 1st interaction, otherwise events may be triggered on
  // DOM elements that had been removed: kibana-canvas github issue #1093
  const canvasPage = ancestorElement(target);
  if (!canvasPage) return;
  const canvasOrigin = canvasPage.getBoundingClientRect();
  window.onmousemove = ({ clientX, clientY, altKey, metaKey, shiftKey, ctrlKey }) => {
    const { x, y } = localMousePosition(canvasOrigin, clientX, clientY);
    commit('cursorPosition', { x, y, altKey, metaKey, shiftKey, ctrlKey });
  };
  window.onmouseup = e => {
    e.stopPropagation();
    const { clientX, clientY, altKey, metaKey, shiftKey, ctrlKey } = e;
    const { x, y } = localMousePosition(canvasOrigin, clientX, clientY);
    commit('mouseEvent', { event: 'mouseUp', x, y, altKey, metaKey, shiftKey, ctrlKey });
    resetHandler();
  };
};

const handleMouseMove = (
  commit,
  { target, clientX, clientY, altKey, metaKey, shiftKey, ctrlKey },
  isEditable
) => {
  // mouse move must be handled even before an initial click
  if (!window.onmousemove && isEditable) {
    const { x, y } = localMousePosition(target, clientX, clientY);
    setupHandler(commit, target);
    commit('cursorPosition', { x, y, altKey, metaKey, shiftKey, ctrlKey });
  }
};

const handleMouseDown = (commit, e, isEditable) => {
  e.stopPropagation();
  const { target, clientX, clientY, button, altKey, metaKey, shiftKey, ctrlKey } = e;
  if (button !== 0 || !isEditable) {
    resetHandler();
    return; // left-click and edit mode only
  }
  const ancestor = ancestorElement(target);
  if (!ancestor) return;
  const { x, y } = localMousePosition(ancestor, clientX, clientY);
  setupHandler(commit, ancestor);
  commit('mouseEvent', { event: 'mouseDown', x, y, altKey, metaKey, shiftKey, ctrlKey });
};

const keyCode = key => (key === 'Meta' ? 'MetaLeft' : 'Key' + key.toUpperCase());

const isNotTextInput = ({ tagName, type }) => {
  // input types that aren't variations of text input
  const nonTextInputs = [
    'button',
    'checkbox',
    'color',
    'file',
    'image',
    'radio',
    'range',
    'reset',
    'submit',
  ];

  switch (tagName.toLowerCase()) {
    case 'input':
      return nonTextInputs.includes(type);
    case 'textarea':
      return false;
    default:
      return true;
  }
};

const modifierKey = key => ['KeyALT', 'KeyCONTROL'].indexOf(keyCode(key)) > -1;

const handleKeyDown = (commit, e, isEditable, remove) => {
  const { key, target } = e;

  if (isEditable) {
    if (isNotTextInput(target) && (key === 'Backspace' || key === 'Delete')) {
      e.preventDefault();
      remove();
    } else if (!modifierKey(key)) {
      commit('keyboardEvent', {
        event: 'keyDown',
        code: keyCode(key), // convert to standard event code
      });
    }
  }
};

const handleKeyUp = (commit, { key }, isEditable) => {
  if (isEditable && !modifierKey(key)) {
    commit('keyboardEvent', {
      event: 'keyUp',
      code: keyCode(key), // convert to standard event code
    });
  }
};

export const withEventHandlers = withHandlers({
  onMouseDown: props => e => handleMouseDown(props.commit, e, props.isEditable),
  onMouseMove: props => e => handleMouseMove(props.commit, e, props.isEditable),
  onKeyDown: props => e => handleKeyDown(props.commit, e, props.isEditable, props.remove),
  onKeyUp: props => e => handleKeyUp(props.commit, e, props.isEditable),
  resetHandler: () => () => resetHandler(),
});
