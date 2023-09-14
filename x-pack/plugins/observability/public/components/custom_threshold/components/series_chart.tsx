/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { MetricsExplorerSeries } from '../../../../common/custom_threshold_rule/metrics_explorer';
import { Color, colorTransformer } from '../../../../common/custom_threshold_rule/color_palette';
import {
  MetricsExplorerChartType,
  MetricsExplorerOptionsMetric,
} from '../../../../common/custom_threshold_rule/types';

import { getMetricId } from '../helpers/get_metric_id';
import { useKibanaTimeZoneSetting } from '../hooks/use_kibana_time_zone_setting';
import { createMetricLabel } from '../helpers/create_metric_label';

type NumberOrString = string | number;

interface Props {
  metric: MetricsExplorerOptionsMetric;
  id: NumberOrString | NumberOrString[];
  series: MetricsExplorerSeries;
  type: MetricsExplorerChartType;
  stack: boolean;
  opacity?: number;
}

export function MetricExplorerSeriesChart(props: Props) {
  if (MetricsExplorerChartType.bar === props.type) {
    return <MetricsExplorerBarChart {...props} />;
  }
  return <MetricsExplorerAreaChart {...props} />;
}

export function MetricsExplorerAreaChart({ metric, id, series, type, stack, opacity }: Props) {
  const timezone = useKibanaTimeZoneSetting();
  const color = (metric.color && colorTransformer(metric.color)) || colorTransformer(Color.color0);

  const yAccessors = Array.isArray(id)
    ? id.map((i) => getMetricId(metric, i)).slice(id.length - 1, id.length)
    : [getMetricId(metric, id)];
  const y0Accessors =
    Array.isArray(id) && id.length > 1
      ? id.map((i) => getMetricId(metric, i)).slice(0, 1)
      : undefined;
  const chartId = `series-${series.id}-${yAccessors.join('-')}`;

  const seriesAreaStyle: RecursivePartial<AreaSeriesStyle> = {
    line: {
      strokeWidth: 2,
      visible: true,
    },
    area: {
      opacity: opacity || 0.5,
      visible: type === MetricsExplorerChartType.area,
    },
  };

  return (
    <AreaSeries
      id={chartId}
      key={chartId}
      name={createMetricLabel(metric)}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={yAccessors}
      y0Accessors={y0Accessors}
      data={series.rows}
      stackAccessors={stack ? ['timestamp'] : void 0}
      areaSeriesStyle={seriesAreaStyle}
      color={color}
      timeZone={timezone}
    />
  );
}

export function MetricsExplorerBarChart({ metric, id, series, stack }: Props) {
  const timezone = useKibanaTimeZoneSetting();
  const color = (metric.color && colorTransformer(metric.color)) || colorTransformer(Color.color0);

  const yAccessors = Array.isArray(id)
    ? id.map((i) => getMetricId(metric, i)).slice(id.length - 1, id.length)
    : [getMetricId(metric, id)];
  const chartId = `series-${series.id}-${yAccessors.join('-')}`;

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
      id={chartId}
      key={chartId}
      name={createMetricLabel(metric)}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={yAccessors}
      data={series.rows}
      stackAccessors={stack ? ['timestamp'] : void 0}
      barSeriesStyle={seriesBarStyle}
      color={color}
      timeZone={timezone}
    />
  );
}
