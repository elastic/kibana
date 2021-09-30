/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CircleIcon } from './circle_icon';
import { LineIcon } from './line_icon';
import { PolygonIcon } from './polygon_icon';
import { SymbolIcon } from './symbol_icon';
import { IconStaticOptions } from '../../../../../../common/descriptor_types';

interface Props {
  fillColor?: string;
  isPointsOnly: boolean;
  isLinesOnly: boolean;
  strokeColor?: string;
  icon?: IconStaticOptions;
}

export function VectorIcon({ fillColor, isPointsOnly, isLinesOnly, strokeColor, icon }: Props) {
  const { value: symbolId, svg } = icon || {};
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
      svg={svg}
      stroke={strokeColor}
    />
  );
}
