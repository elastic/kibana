/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import aero from '../../lib/aeroelastic';

export const BorderResizeHandle = ({ transformMatrix }) => (
  <div
    className="canvasBorderResizeHandle canvasLayoutAnnotation"
    style={{ transform: aero.dom.matrixToCSS(transformMatrix) }}
  />
);

BorderResizeHandle.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
};
