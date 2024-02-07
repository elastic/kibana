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
import { MetricsExplorerSeries } from '../types';
import { Color, colorTransformer } from '../../../../common/custom_threshold_rule/color_palette';
import { MetricsExplorerChartType } from '../../../../common/custom_threshold_rule/types';

import { useKibanaTimeZoneSetting } from '../hooks/use_kibana_time_zone_setting';

type NumberOrString = string | number;

interface Props {
  name: string;
  color: Color;
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

export function MetricsExplorerAreaChart({ name, color, id, series, type, stack, opacity }: Props) {
  const timezone = useKibanaTimeZoneSetting();
  const seriesColor = (color && colorTransformer(color)) || colorTransformer(Color.color0);

  const yAccessors = Array.isArray(id)
    ? id.map((i) => `metric_${i}`).slice(id.length - 1, id.length)
    : [`metric_${id}`];
  const y0Accessors =
    Array.isArray(id) && id.length > 1 ? id.map((i) => `metric_${i}`).slice(0, 1) : undefined;
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
      name={name}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={yAccessors}
      y0Accessors={y0Accessors}
      data={series.rows}
      stackAccessors={stack ? ['timestamp'] : void 0}
      areaSeriesStyle={seriesAreaStyle}
      color={seriesColor}
      timeZone={timezone}
    />
  );
}

export function MetricsExplorerBarChart({ name, color, id, series, stack }: Props) {
  const timezone = useKibanaTimeZoneSetting();
  const seriesColor = (color && colorTransformer(color)) || colorTransformer(Color.color0);

  const yAccessors = Array.isArray(id)
    ? id.map((i) => `metric_${i}`).slice(id.length - 1, id.length)
    : [`metric_${id}`];
  const chartId = `series-${series.id}-${yAccessors.join('-')}`;

  const seriesBarStyle: RecursivePartial<BarSeriesStyle> = {
    rectBorder: {
      stroke: seriesColor,
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
      name={name}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={yAccessors}
      data={series.rows}
      stackAccessors={stack ? ['timestamp'] : void 0}
      barSeriesStyle={seriesBarStyle}
      color={seriesColor}
      timeZone={timezone}
    />
  );
}
