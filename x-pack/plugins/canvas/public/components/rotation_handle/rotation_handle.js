/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import aero from '../../lib/aeroelastic';

export const RotationHandle = ({ transformMatrix }) => (
  <div
    className="canvasRotationHandle canvasRotationHandle--connector canvasLayoutAnnotation"
    style={{ transform: aero.dom.matrixToCSS(transformMatrix) }}
  >
    <div className="canvasRotationHandle--handle" />
  </div>
);

RotationHandle.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
};
