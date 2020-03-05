/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  ScaleType,
  AreaSeries,
  BarSeries,
  RecursivePartial,
  AreaSeriesStyle,
  BarSeriesStyle,
} from '@elastic/charts';
import { MetricsExplorerSeries } from '../../../common/http_api/metrics_explorer';
import { colorTransformer, MetricsExplorerColor } from '../../../common/color_palette';
import { createMetricLabel } from './helpers/create_metric_label';
import {
  MetricsExplorerOptionsMetric,
  MetricsExplorerChartType,
} from '../../containers/metrics_explorer/use_metrics_explorer_options';

interface Props {
  metric: MetricsExplorerOptionsMetric;
  id: string | number;
  series: MetricsExplorerSeries;
  type: MetricsExplorerChartType;
  stack: boolean;
}

export const MetricExplorerSeriesChart = (props: Props) => {
  if (MetricsExplorerChartType.bar === props.type) {
    return <MetricsExplorerBarChart {...props} />;
  }
  return <MetricsExplorerAreaChart {...props} />;
};

export const MetricsExplorerAreaChart = ({ metric, id, series, type, stack }: Props) => {
  const color =
    (metric.color && colorTransformer(metric.color)) ||
    colorTransformer(MetricsExplorerColor.color0);

  const yAccessor = `metric_${id}`;
  const chartId = `series-${series.id}-${yAccessor}`;

  const seriesAreaStyle: RecursivePartial<AreaSeriesStyle> = {
    line: {
      strokeWidth: 2,
      visible: true,
    },
    area: {
      opacity: 0.5,
      visible: type === MetricsExplorerChartType.area,
    },
  };
  return (
    <AreaSeries
      id={yAccessor}
      key={chartId}
      name={createMetricLabel(metric)}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={[yAccessor]}
      data={series.rows}
      stackAccessors={stack ? ['timestamp'] : void 0}
      areaSeriesStyle={seriesAreaStyle}
      customSeriesColors={[color]}
    />
  );
};

export const MetricsExplorerBarChart = ({ metric, id, series, stack }: Props) => {
  const color =
    (metric.color && colorTransformer(metric.color)) ||
    colorTransformer(MetricsExplorerColor.color0);

  const yAccessor = `metric_${id}`;
  const chartId = `series-${series.id}-${yAccessor}`;

  const seriesBarStyle: RecursivePartial<BarSeriesStyle> = {
    rectBorder: {
      stroke: color,
      strokeWidth: 1,
      visible: true,
    },
    rect: {
      opacity: 1,
    },
  };
  return (
    <BarSeries
      id={yAccessor}
      key={chartId}
      name={createMetricLabel(metric)}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={[yAccessor]}
      data={series.rows}
      stackAccessors={stack ? ['timestamp'] : void 0}
      barSeriesStyle={seriesBarStyle}
      customSeriesColors={[color]}
    />
  );
};
