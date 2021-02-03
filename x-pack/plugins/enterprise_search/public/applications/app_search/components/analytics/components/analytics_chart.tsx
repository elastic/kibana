/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import moment from 'moment';
import { Chart, Settings, LineSeries, CurveType, Axis } from '@elastic/charts';

import { KibanaLogic } from '../../../../shared/kibana';

import { X_AXIS_DATE_FORMAT, TOOLTIP_DATE_FORMAT } from '../constants';

interface ChartPoint {
  x: string; // Date string
  y: number; // # of clicks, queries, etc.
}
export type ChartData = ChartPoint[];

interface Props {
  height?: number;
  lines: Array<{
    id: string;
    data: ChartData;
    isDashed?: boolean;
  }>;
}
export const AnalyticsChart: React.FC<Props> = ({ height = 300, lines }) => {
  const { charts } = useValues(KibanaLogic);

  return (
    <Chart size={{ height }}>
      <Settings
        theme={charts.theme.useChartsTheme()}
        baseTheme={charts.theme.useChartsBaseTheme()}
        tooltip={{
          headerFormatter: (tooltip) => moment(tooltip.value).format(TOOLTIP_DATE_FORMAT),
        }}
      />
      {lines.map(({ id, data, isDashed }) => (
        <LineSeries
          key={id}
          id={id}
          data={data}
          xAccessor={'x'}
          yAccessors={['y']}
          curve={CurveType.CURVE_MONOTONE_X}
          lineSeriesStyle={isDashed ? { line: { dash: [5, 5] } } : undefined}
        />
      ))}
      <Axis
        id="bottom-axis"
        position="bottom"
        tickFormat={(d) => moment(d).format(X_AXIS_DATE_FORMAT)}
        showGridLines
      />
      <Axis id="left-axis" position="left" ticks={4} showGridLines />
    </Chart>
  );
};
