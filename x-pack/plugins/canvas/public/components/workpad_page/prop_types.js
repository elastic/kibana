/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// NOTE: the data-shared-* attributes here are used for reporting
import PropTypes from 'prop-types';

export const staticWorkpadPagePropTypes = {
  pageId: PropTypes.string.isRequired,
  pageStyle: PropTypes.object,
  className: PropTypes.string.isRequired,
  animationStyle: PropTypes.object.isRequired,
  elements: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
      width: PropTypes.number.isRequired,
      height: PropTypes.number.isRequired,
      type: PropTypes.string,
    })
  ).isRequired,
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  onAnimationEnd: PropTypes.func,
};

export const interactiveWorkpadPagePropTypes = {
  ...staticWorkpadPagePropTypes,
  cursor: PropTypes.string,
  onDoubleClick: PropTypes.func,
  onKeyDown: PropTypes.func,
  onMouseDown: PropTypes.func,
  onMouseLeave: PropTypes.func,
  onMouseMove: PropTypes.func,
  onMouseUp: PropTypes.func,
  onAnimationEnd: PropTypes.func,
  resetHandler: PropTypes.func,
  copyElements: PropTypes.func,
  cutElements: PropTypes.func,
  duplicateElements: PropTypes.func,
  pasteElements: PropTypes.func,
  removeElements: PropTypes.func,
  bringForward: PropTypes.func,
  bringToFront: PropTypes.func,
  sendBackward: PropTypes.func,
  sendToBack: PropTypes.func,
  canvasOrigin: PropTypes.func,
  saveCanvasOrigin: PropTypes.func.isRequired,
  commit: PropTypes.func.isRequired,
};
