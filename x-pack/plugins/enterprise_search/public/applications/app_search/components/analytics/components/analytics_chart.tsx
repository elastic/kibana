/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import moment from 'moment';

import { Chart, Settings, LineSeries, CurveType, Axis, Tooltip } from '@elastic/charts';

import { i18n } from '@kbn/i18n';

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
      <Tooltip headerFormatter={(tooltip) => moment(tooltip.value).format(TOOLTIP_DATE_FORMAT)} />
      <Settings baseTheme={charts.theme.useChartsBaseTheme()} locale={i18n.getLocale()} />
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
        gridLine={{ visible: true }}
      />
      <Axis id="left-axis" position="left" ticks={4} gridLine={{ visible: true }} />
    </Chart>
  );
};
