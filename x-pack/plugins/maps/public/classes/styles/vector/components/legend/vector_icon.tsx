/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { CSSProperties } from 'react';

import { CircleIcon } from './circle_icon';
import { LineIcon } from './line_icon';
import { PolygonIcon } from './polygon_icon';
import { SymbolIcon } from './symbol_icon';

interface Props {
  borderStyle?: CSSProperties;
  fillColor?: string;
  isPointsOnly: boolean;
  isLinesOnly: boolean;
  strokeColor?: string;
  symbolId?: string;
  svg?: string;
}

export function VectorIcon({
  borderStyle = {},
  fillColor,
  isPointsOnly,
  isLinesOnly,
  strokeColor,
  symbolId,
  svg,
}: Props) {
  if (isLinesOnly) {
    const style = {
      stroke: strokeColor,
      strokeWidth: '4px',
      ...borderStyle,
    };
    return <LineIcon style={style} />;
  }

  const style = {
    stroke: strokeColor,
    strokeWidth: '1px',
    fill: fillColor,
    ...borderStyle,
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
      style={borderStyle}
      svg={svg}
    />
  );
}
