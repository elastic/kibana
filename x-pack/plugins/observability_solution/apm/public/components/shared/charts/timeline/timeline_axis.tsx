/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inRange } from 'lodash';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import { Mark } from '.';
import { Marker } from './marker';
import { PlotValues } from './plot_utils';

// Remove any tick that is too close to topTraceDuration
const getXAxisTickValues = (tickValues: number[], topTraceDuration?: number) => {
  if (topTraceDuration == null) {
    return tickValues;
  }

  const padding = (tickValues[1] - tickValues[0]) / 2;
  const lowerBound = topTraceDuration - padding;
  const upperBound = topTraceDuration + padding;

  return tickValues.filter((value) => {
    const isInRange = inRange(value, lowerBound, upperBound);
    return !isInRange && value !== topTraceDuration;
  });
};

interface TimelineAxisProps {
  plotValues: PlotValues;
  marks?: Mark[];
  topTraceDuration: number;
}

export function TimelineAxis({ plotValues, marks = [], topTraceDuration }: TimelineAxisProps) {
  const { euiTheme } = useEuiTheme();
  const { margins, tickValues, width, xMax, xScale } = plotValues;
  const tickFormatter = getDurationFormatter(xMax);

  const tickPositionsAndLabels = getXAxisTickValues(tickValues, topTraceDuration).reduce<
    Array<{ position: number; label: string }>
  >((ticks, tick) => {
    const position = xScale(tick);
    return Number.isFinite(position)
      ? [...ticks, { position, label: tickFormatter(tick).formatted }]
      : ticks;
  }, []);
  const topTraceDurationPosition = topTraceDuration > 0 ? xScale(topTraceDuration) : NaN;

  return (
    <div
      style={{
        height: margins.top,
        width: '100%',
      }}
    >
      <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={margins.top}>
        <g transform={`translate(0 ${margins.top - 20})`}>
          {tickPositionsAndLabels.map(({ position, label }) => (
            <text
              key={`tick-${position}`}
              x={position}
              y={0}
              textAnchor="middle"
              fill={euiTheme.colors.darkShade}
              fontSize={11}
            >
              {label}
            </text>
          ))}
          {Number.isFinite(topTraceDurationPosition) && (
            <text
              key="topTrace"
              x={topTraceDurationPosition}
              y={0}
              fill={euiTheme.colors.text}
              textAnchor="middle"
            >
              {tickFormatter(topTraceDuration).formatted}
            </text>
          )}
        </g>
      </svg>

      {marks.map((mark) => (
        <Marker key={mark.id} mark={mark} x={xScale(mark.offset) ?? 0} />
      ))}
    </div>
  );
}
