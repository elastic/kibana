/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export default function LastTickValue({ x, marginTop, value }) {
  return (
    <g transform={`translate(${x}, ${marginTop})`}>
      <text textAnchor="middle" dy="0" transform="translate(0, -8)">
        {value}
      </text>
    </g>
  );
}

LastTickValue.requiresSVG = true;
