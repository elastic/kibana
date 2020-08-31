/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

function SingleRect({ innerHeight, marginTop, style, x, width }) {
  return (
    <rect
      style={style}
      height={innerHeight}
      width={width}
      rx={'2px'}
      ry={'2px'}
      x={x}
      y={marginTop}
    />
  );
}

SingleRect.requiresSVG = true;
SingleRect.propTypes = {
  x: PropTypes.number.isRequired,
};

export default SingleRect;
