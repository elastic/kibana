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
  height: number;
  transformMatrix: TransformMatrix3d;
  width: number;
}

export const DragBoxAnnotation: FC<Props> = ({ transformMatrix, width, height }) => (
  <div
    className="canvasDragBoxAnnotation canvasLayoutAnnotation"
    style={{
      height,
      marginLeft: -width / 2,
      marginTop: -height / 2,
      transform: matrixToCSS(transformMatrix),
      width,
    }}
  />
);

DragBoxAnnotation.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};
