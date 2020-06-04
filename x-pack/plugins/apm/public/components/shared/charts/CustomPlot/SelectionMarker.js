/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

function SelectionMarker({ innerHeight, marginTop, start, end }) {
  const width = Math.abs(end - start);
  const x = start < end ? start : end;
  return (
    <rect
      pointerEvents="none"
      fill="black"
      fillOpacity="0.1"
      x={x}
      y={marginTop}
      width={width}
      height={innerHeight}
    />
  );
}

SelectionMarker.requiresSVG = true;
SelectionMarker.propTypes = {
  start: PropTypes.number,
  end: PropTypes.number,
};

export default SelectionMarker;
