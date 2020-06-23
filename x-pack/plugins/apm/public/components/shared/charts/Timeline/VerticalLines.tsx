/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { VerticalGridLines, XYPlot } from 'react-vis';
import { useTheme } from '../../../../hooks/useTheme';
import { Mark } from '../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Marks';
import { PlotValues } from './plotUtils';

interface VerticalLinesProps {
  marks?: Mark[];
  plotValues: PlotValues;
  topTraceDuration: number;
}

export const VerticalLines = ({
  topTraceDuration,
  plotValues,
  marks = [],
}: VerticalLinesProps) => {
  const { width, height, margins, xDomain, tickValues } = plotValues;

  const markTimes = marks
    .filter((mark) => mark.verticalLine)
    .map(({ offset }) => offset);

  const theme = useTheme();

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    >
      <XYPlot
        dontCheckIfEmpty
        width={width}
        height={height + margins.top}
        margin={margins}
        xDomain={xDomain}
      >
        <VerticalGridLines
          tickValues={tickValues}
          style={{ stroke: theme.eui.euiColorLightestShade }}
        />

        <VerticalGridLines
          tickValues={markTimes}
          style={{ stroke: theme.eui.euiColorMediumShade }}
        />

        {topTraceDuration > 0 && (
          <VerticalGridLines
            tickValues={[topTraceDuration]}
            style={{ stroke: theme.eui.euiColorMediumShade }}
          />
        )}
      </XYPlot>
    </div>
  );
};
