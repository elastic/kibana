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
  AreaSeries,
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
    fontSize: 8,
    fill: axisColor,
    padding: 10,
  },
  tickLine: {
    stroke: axisColor,
    size: 0,
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
    <div style={{ width: '210px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <small
        style={{
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >{`${field}:${value}`}</small>
      <Chart
        size={{
          width: '200px',
          height: '180px',
        }}
      >
        <Settings rotation={0} theme={theme} showLegend={false} />

        <Axis id="x-axis" title="" position={Position.Bottom} />
        <Axis id="y-axis" title="" position={Position.Left} />
        <AreaSeries
          id="magnitude"
          xScaleType={ScaleType.Log}
          yScaleType={ScaleType.Log}
          data={histogram}
          {...barSeriesSpec}
        />
      </Chart>
      <EuiSpacer size="s" />
    </div>
  );
};
