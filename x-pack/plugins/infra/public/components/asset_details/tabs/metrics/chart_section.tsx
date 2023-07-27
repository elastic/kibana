/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  Chart,
  Settings,
  Position,
  type ChartSizeArray,
  type PointerUpdateListener,
  type TickFormatter,
  Tooltip,
} from '@elastic/charts';
import moment from 'moment';
import React from 'react';
import {
  MetricsExplorerChartType,
  type MetricsExplorerOptionsMetric,
} from '../../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { MetricExplorerSeriesChart } from '../../../../pages/metrics/metrics_explorer/components/series_chart';
import type { MetricsExplorerSeries } from '../../../../../common/http_api';
import { useTimelineChartTheme } from '../../../../utils/use_timeline_chart_theme';

import { ChartHeader } from './chart_header';

const CHART_SIZE: ChartSizeArray = ['100%', 160];

interface Props {
  title: string;
  style: MetricsExplorerChartType;
  chartRef: React.Ref<Chart>;
  series: ChartSectionSeries[];
  tickFormatterForTime: TickFormatter<any>;
  tickFormatter: TickFormatter<any>;
  onPointerUpdate: PointerUpdateListener;
  domain: { max: number; min: number };
  stack?: boolean;
}

export interface ChartSectionSeries {
  metric: MetricsExplorerOptionsMetric;
  series: MetricsExplorerSeries;
}

export const ChartSection = ({
  title,
  style,
  chartRef,
  series,
  tickFormatterForTime,
  tickFormatter,
  onPointerUpdate,
  domain,
  stack = false,
}: Props) => {
  const chartTheme = useTimelineChartTheme();
  const metrics = series.map((chartSeries) => chartSeries.metric);

  return (
    <>
      <ChartHeader title={title} metrics={metrics} />
      <Chart ref={chartRef} size={CHART_SIZE}>
        {series.map((chartSeries, index) => (
          <MetricExplorerSeriesChart
            type={style}
            metric={chartSeries.metric}
            id="0"
            key={chartSeries.series.id}
            series={chartSeries.series}
            stack={stack}
          />
        ))}
        <Axis
          id="timestamp"
          position={Position.Bottom}
          showOverlappingTicks={true}
          tickFormat={tickFormatterForTime}
        />
        <Axis
          id="values"
          position={Position.Left}
          tickFormat={tickFormatter}
          domain={domain}
          ticks={6}
          gridLine={{
            visible: true,
          }}
        />
        <Tooltip headerFormatter={({ value }) => moment(value).format('Y-MM-DD HH:mm:ss.SSS')} />
        <Settings
          onPointerUpdate={onPointerUpdate}
          baseTheme={chartTheme.baseTheme}
          theme={chartTheme.theme}
        />
      </Chart>
    </>
  );
};
