/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { CircleIcon } from './circle_icon';
import { LineIcon } from './line_icon';
import { PolygonIcon } from './polygon_icon';
import { SymbolIcon } from './symbol_icon';

interface Props {
  fillColor?: string;
  isPointsOnly: boolean;
  isLinesOnly: boolean;
  strokeColor?: string;
  symbolId?: string;
}

export function VectorIcon({ fillColor, isPointsOnly, isLinesOnly, strokeColor, symbolId }: Props) {
  if (isLinesOnly) {
    const style = {
      stroke: strokeColor,
      strokeWidth: '4px',
    };
    return <LineIcon style={style} />;
  }

  const style = {
    stroke: strokeColor,
    strokeWidth: '1px',
    fill: fillColor,
  };

  if (!isPointsOnly) {
    return <PolygonIcon style={style} />;
  }

  if (!symbolId) {
    return <CircleIcon style={style} />;
  }

  return (
    <SymbolIcon
      key={`${symbolId}${fillColor}${strokeColor}`}
      symbolId={symbolId}
      fill={fillColor}
      stroke={strokeColor}
    />
  );
}
