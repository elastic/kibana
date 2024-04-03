/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';
import {
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_HIDDEN_LEGEND,
  DEFAULT_XY_LEGEND,
  DEFAULT_XY_YBOUNDS,
} from '../../../shared/charts/constants';

const memoryUsageBreakdown: LensConfigWithId = {
  id: 'memoryUsageBreakdown',
  chartType: 'xy',
  title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.memoryUsage', {
    defaultMessage: 'Memory Usage',
  }),
  layers: [
    {
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [
        {
          ...formulas.memoryCache,
          label: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.metric.label.cache', {
            defaultMessage: 'Cache',
          }),
        },
        {
          ...formulas.memoryUsed,
          label: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.metric.label.used', {
            defaultMessage: 'Used',
          }),
        },
        {
          ...formulas.memoryFreeExcludingCache,
          label: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.metric.label.free', {
            defaultMessage: 'Free',
          }),
        },
      ],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const memoryUsageXY: LensConfigWithId = {
  id: 'memoryUsage',
  chartType: 'xy',
  title: formulas.memoryUsage.label ?? '',
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.memoryUsage],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_YBOUNDS,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const memoryFree: LensConfigWithId = {
  id: 'memoryFree',
  chartType: 'xy',
  title: formulas.memoryFree.label ?? '',
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.memoryFree],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const memoryUsageMetric: LensConfigWithId = {
  id: 'memoryUsage',
  chartType: 'metric',
  title: formulas.memoryUsage.label ?? '',
  trendLine: true,
  ...formulas.memoryUsage,
};

export const memory = {
  xy: {
    memoryUsageBreakdown,
    memoryUsage: memoryUsageXY,
    memoryFree,
  },
  metric: {
    memoryUsage: memoryUsageMetric,
  },
};
