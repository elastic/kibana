/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import {
  Chart,
  Settings,
  Axis,
  ScaleType,
  Position,
  BarSeries,
  RecursivePartial,
  AxisStyle,
  PartialTheme,
  BarSeriesSpec,
} from '@elastic/charts';

import euiVars from '@elastic/eui/dist/eui_theme_light.json';

import { EuiSpacer } from '@elastic/eui';

const { euiColorMediumShade } = euiVars;
const axisColor = euiColorMediumShade;

const axes: RecursivePartial<AxisStyle> = {
  axisLine: {
    stroke: axisColor,
  },
  tickLabel: {
    fontSize: 12,
    fill: axisColor,
  },
  tickLine: {
    stroke: axisColor,
  },
  gridLine: {
    horizontal: {
      dash: [1, 2],
    },
    vertical: {
      strokeWidth: 0,
    },
  },
};
const theme: PartialTheme = {
  axes,
  legend: {
    spacingBuffer: 100,
  },
};

const barSeriesSpec: Partial<BarSeriesSpec> = {
  xAccessor: 'key',
  yAccessors: ['doc_count_full', 'doc_count'],
};

interface CorrelationChartProps {
  field: string;
  value: string;
  histogram: Array<{ key: string; doc_count: number; doc_count_full: number }>;
}

export const CorrelationChart: FC<CorrelationChartProps> = ({ field, value, histogram }) => {
  return (
    <div>
      {`${field}:${value}`}
      <Chart
        size={{
          width: '100%',
          height: '120px',
        }}
      >
        <Settings rotation={0} theme={theme} showLegend={false} />

        <Axis id="x-axis" title="" position={Position.Bottom} />
        <Axis id="y-axis" title="" position={Position.Left} />
        <BarSeries
          id="magnitude"
          xScaleType={ScaleType.Ordinal}
          yScaleType={ScaleType.Log}
          data={histogram}
          {...barSeriesSpec}
        />
      </Chart>
      <EuiSpacer size="s" />
    </div>
  );
};
