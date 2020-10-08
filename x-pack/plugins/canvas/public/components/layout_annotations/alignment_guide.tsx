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

export const AlignmentGuide: FC<Props> = ({ transformMatrix, width, height }) => (
  <div
    className="canvasAlignmentGuide canvasInteractable canvasLayoutAnnotation"
    style={{
      background: 'magenta',
      height,
      marginLeft: -width / 2,
      marginTop: -height / 2,
      position: 'absolute',
      transform: matrixToCSS(transformMatrix),
      width,
    }}
  />
);

AlignmentGuide.propTypes = {
  height: PropTypes.number.isRequired,
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  width: PropTypes.number.isRequired,
};
