/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { matrixToCSS } from '../../lib/dom';

export const HoverAnnotation = ({ transformMatrix, text }) => {
  const newStyle = {
    transform: `${matrixToCSS(transformMatrix)} translate(1em, -1em)`,
  };
  return (
    <div className="tooltipAnnotation canvasLayoutAnnotation" style={newStyle}>
      <p>{text}°</p>
    </div>
  );
};

HoverAnnotation.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  text: PropTypes.string.isRequired,
};
