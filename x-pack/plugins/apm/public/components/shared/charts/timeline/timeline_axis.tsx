/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inRange } from 'lodash';
import React, { ReactNode } from 'react';
import { XAxis, XYPlot } from 'react-vis';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import { useTheme } from '../../../../hooks/use_theme';
import { Mark } from './';
import { LastTickValue } from './last_tick_value';
import { Marker } from './marker';
import { PlotValues } from './plot_utils';

// Remove any tick that is too close to topTraceDuration
const getXAxisTickValues = (
  tickValues: number[],
  topTraceDuration?: number
) => {
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
  header?: ReactNode;
  plotValues: PlotValues;
  marks?: Mark[];
  topTraceDuration: number;
}

export function TimelineAxis({
  plotValues,
  marks = [],
  topTraceDuration,
}: TimelineAxisProps) {
  const theme = useTheme();
  const { margins, tickValues, width, xDomain, xMax, xScale } = plotValues;
  const tickFormatter = getDurationFormatter(xMax);
  const xAxisTickValues = getXAxisTickValues(tickValues, topTraceDuration);
  const topTraceDurationFormatted = tickFormatter(topTraceDuration).formatted;

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        borderBottom: `1px solid ${theme.eui.euiColorMediumShade}`,
        height: margins.top,
        zIndex: 2,
        width: '100%',
      }}
    >
      <XYPlot
        dontCheckIfEmpty
        width={width}
        height={margins.top}
        margin={{
          top: margins.top,
          left: margins.left,
          right: margins.right,
        }}
        xDomain={xDomain}
      >
        <XAxis
          hideLine
          orientation="top"
          tickSize={0}
          tickValues={xAxisTickValues}
          tickFormat={(time?: number) => tickFormatter(time).formatted}
          tickPadding={20}
          style={{
            text: { fill: theme.eui.euiColorDarkShade },
          }}
        />

        {topTraceDuration > 0 && (
          <LastTickValue
            x={xScale(topTraceDuration)}
            value={topTraceDurationFormatted}
            marginTop={28}
          />
        )}

        {marks.map((mark) => (
          <Marker key={mark.id} mark={mark} x={xScale(mark.offset)} />
        ))}
      </XYPlot>
    </div>
  );
}
