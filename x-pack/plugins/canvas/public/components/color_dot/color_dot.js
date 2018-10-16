/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

export const ColorDot = ({ value, children }) => {
  return (
    <div className="canvasColorDot">
      <div className="canvasColorDot__background canvasCheckered" />
      <div className="canvasColorDot__foreground" style={{ background: value }}>
        {children}
      </div>
    </div>
  );
};

ColorDot.propTypes = {
  value: PropTypes.string,
  children: PropTypes.node,
  handleClick: PropTypes.func,
};
