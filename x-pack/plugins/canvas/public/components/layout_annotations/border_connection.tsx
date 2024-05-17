/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React, { FC } from 'react';
import { TransformMatrix3d } from '../../lib/aeroelastic';
import { matrixToCSS } from '../../lib/dom';

interface Props {
  height: number;
  transformMatrix: TransformMatrix3d;
  width: number;
}

export const BorderConnection: FC<Props> = ({ transformMatrix, width, height }) => (
  <div
    className="canvasBorderConnection canvasLayoutAnnotation"
    style={{
      height,
      marginLeft: -width / 2,
      marginTop: -height / 2,
      position: 'absolute',
      transform: matrixToCSS(transformMatrix),
      width,
    }}
  />
);

BorderConnection.propTypes = {
  height: PropTypes.number.isRequired,
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  width: PropTypes.number.isRequired,
};
