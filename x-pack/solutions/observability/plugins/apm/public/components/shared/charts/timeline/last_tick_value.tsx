/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

interface LastTickValueProps {
  x: number;
  marginTop: number;
  value: string;
}
export function LastTickValue({ x, marginTop, value }: LastTickValueProps) {
  return (
    <g transform={`translate(${x}, ${marginTop})`}>
      <text textAnchor="middle" dy="0" transform="translate(0, -8)">
        {value}
      </text>
    </g>
  );
}

LastTickValue.requiresSVG = true;
