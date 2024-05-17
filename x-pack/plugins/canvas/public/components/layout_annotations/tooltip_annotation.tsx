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
  transformMatrix: TransformMatrix3d;
  text: string;
}

export const TooltipAnnotation: FC<Props> = ({ transformMatrix, text }) => {
  const newStyle = {
    transform: `${matrixToCSS(transformMatrix)} translate(1em, -1em)`,
  };
  return (
    <div className="tooltipAnnotation canvasLayoutAnnotation" style={newStyle}>
      <p>{text}°</p>
    </div>
  );
};

TooltipAnnotation.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  text: PropTypes.string.isRequired,
};
