/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { BarSegments } from './bar_segments';

export interface BarSegment {
  id: string;
  left: number;
  width: number;
  color: string;
}

export function Bar({
  width,
  left,
  color,
  segments,
  duration,
  composite,
}: {
  width: number;
  left: number;
  color: string;
  segments?: BarSegment[];
  duration?: number;
  composite?: { count: number; sum: number };
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        position: relative;
        height: ${euiTheme.size.base};
        width: ${width}%;
        margin-left: ${left}%;
      `}
      style={getBarStyle(color, duration, composite)}
    >
      {segments?.length ? <BarSegments segments={segments} /> : null}
    </div>
  );
}

export function getBarStyle(
  color: string,
  duration?: number,
  composite?: { count: number; sum: number }
) {
  if (!duration || !composite || composite.count === 0) return { backgroundColor: color };

  const percNumItems = 100.0 / composite.count;
  const spanSumRatio = composite.sum / duration;
  const percDuration = percNumItems * spanSumRatio;

  return {
    backgroundImage:
      `repeating-linear-gradient(90deg, ${color},` +
      ` ${color} max(${percDuration}%,3px),` +
      ` transparent max(${percDuration}%,3px),` +
      ` transparent max(${percNumItems}%,max(${percDuration}%,3px) + 3px))`,
    backgroundColor: 'transparent',
  };
}
