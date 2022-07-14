/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AreaSeries,
  Axis,
  BrushAxis,
  Chart,
  CurveType,
  Fit,
  Settings,
  StackMode,
  timeFormatter,
} from '@elastic/charts';
import React, { useContext } from 'react';
import { stackTraceAreaSeriesStyle } from '../utils/get_next_time_range/chart_styles';
import { TopNContext } from './contexts/topn';

export interface StackedBarChartProps {
  id: string;
  name: string;
  height: number;
  x: string;
  y: string;
  category: string;
  asPercentages: boolean;
  onBrushEnd: (range: { rangeFrom: string; rangeTo: string }) => void;
}

export const StackedBarChart: React.FC<StackedBarChartProps> = ({
  id,
  name,
  height,
  x,
  y,
  category,
  asPercentages,
  onBrushEnd,
}) => {
  const ctx = useContext(TopNContext);

  return (
    <Chart size={{ height }}>
      <Settings
        showLegend={false}
        tooltip={{ showNullValues: false }}
        brushAxis={BrushAxis.X}
        onBrushEnd={(brushEvent) => {
          const rangeFrom = new Date(brushEvent.x![0]).toISOString();
          const rangeTo = new Date(brushEvent.x![1]).toISOString();

          onBrushEnd({ rangeFrom, rangeTo });
        }}
      />
      <AreaSeries
        id={id}
        name={name}
        data={ctx.samples}
        xAccessor={x}
        yAccessors={[y]}
        stackAccessors={[x]}
        splitSeriesAccessors={[category]}
        areaSeriesStyle={stackTraceAreaSeriesStyle}
        curve={CurveType.CURVE_STEP_AFTER}
        fit={Fit.Zero}
        stackMode={asPercentages ? StackMode.Percentage : undefined}
      />
      <Axis id="bottom-axis" position="bottom" tickFormat={timeFormatter('YYYY-MM-DD HH:mm:ss')} />
      <Axis
        id="left-axis"
        position="left"
        showGridLines
        tickFormat={(d) => (asPercentages ? `${Number(d * 100).toFixed(0)} %` : d.toFixed(0))}
      />
    </Chart>
  );
};
