/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { matrixToCSS } from '../../lib/dom';

export const RotationHandle = ({ transformMatrix, zoomScale }) => (
  <div
    className="canvasRotationHandle canvasRotationHandle--connector canvasLayoutAnnotation"
    style={{
      transform: matrixToCSS(transformMatrix),
    }}
  >
    <div
      className="canvasRotationHandle--handle"
      style={{ transform: `scale3d(${1 / zoomScale},${1 / zoomScale},1)` }}
    />
  </div>
);

RotationHandle.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
};
