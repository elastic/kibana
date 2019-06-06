/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  LineSeries,
  ScaleType,
  getSpecId,
  DataSeriesColorsValues,
  CustomSeriesColorsMap,
} from '@elastic/charts';
import '@elastic/charts/dist/style.css';
import { MetricsExplorerSeries } from '../../../server/routes/metrics_explorer/types';
import { colorTransformer, MetricsExplorerColor } from '../../../common/color_palette';
import { createMetricLabel } from './helpers/create_metric_label';
import { MetricsExplorerOptionsMetric } from '../../containers/metrics_explorer/use_metrics_explorer_options';

interface Props {
  metric: MetricsExplorerOptionsMetric;
  id: string | number;
  series: MetricsExplorerSeries;
}

export const MetricLineSeries = ({ metric, id, series }: Props) => {
  const color =
    (metric.color && colorTransformer(metric.color)) ||
    colorTransformer(MetricsExplorerColor.color0);
  const seriesLineStyle = {
    line: {
      stroke: color,
      strokeWidth: 2,
      visible: true,
    },
    border: {
      visible: false,
      strokeWidth: 2,
      stroke: color,
    },
    point: {
      visible: false,
      radius: 0.2,
      stroke: color,
      strokeWidth: 2,
      opacity: 1,
    },
  };

  const yAccessor = `metric_${id}`;
  const specId = getSpecId(yAccessor);
  const colors: DataSeriesColorsValues = {
    colorValues: [],
    specId,
  };
  const customColors: CustomSeriesColorsMap = new Map();
  customColors.set(colors, color);

  return (
    <LineSeries
      key={`series-${series.id}-${yAccessor}`}
      id={specId}
      name={createMetricLabel(metric)}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={[yAccessor]}
      data={series.rows}
      lineSeriesStyle={seriesLineStyle}
      customSeriesColors={customColors}
    />
  );
};
