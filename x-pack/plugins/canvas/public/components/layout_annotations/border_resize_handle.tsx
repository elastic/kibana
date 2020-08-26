/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { matrixToCSS } from '../../lib/dom';
import { TransformMatrix3d } from '../../lib/aeroelastic';

interface Props {
  transformMatrix: TransformMatrix3d;
  zoomScale?: number;
}

export const BorderResizeHandle: FC<Props> = ({ transformMatrix, zoomScale = 1 }) => (
  <div
    className="canvasBorderResizeHandle canvasLayoutAnnotation"
    style={{
      transform: `${matrixToCSS(transformMatrix)} scale3d(${1 / zoomScale},${1 / zoomScale}, 1)`,
    }}
  />
);

BorderResizeHandle.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  zoomScale: PropTypes.number,
};
