/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_HIDDEN_LEGEND,
  DEFAULT_XY_LEGEND,
  DEFAULT_XY_YBOUNDS,
} from '../../../shared/charts/constants';
import { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';

const cpuUsageBreakdown: LensConfigWithId = {
  id: 'cpuUsageBreakdown',
  chartType: 'xy',
  title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.cpuUsage', {
    defaultMessage: 'CPU Usage',
  }),
  layers: [
    {
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [
        formulas.cpuUsageIowait,
        formulas.cpuUsageIrq,
        formulas.cpuUsageNice,
        formulas.cpuUsageSoftirq,
        formulas.cpuUsageSteal,
        formulas.cpuUsageUser,
        formulas.cpuUsageSystem,
      ],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_LEGEND,
  ...DEFAULT_XY_YBOUNDS,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const loadBreakdown: LensConfigWithId = {
  id: 'loadBreakdown',
  chartType: 'xy',
  title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.load', {
    defaultMessage: 'Load',
  }),
  layers: [
    {
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.load1m, formulas.load5m, formulas.load15m],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const cpuUsageXY: LensConfigWithId = {
  id: 'cpuUsage',
  chartType: 'xy',
  title: formulas.cpuUsage.label ?? '',
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.cpuUsage],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  ...DEFAULT_XY_YBOUNDS,
};

const normalizedLoad1mXY: LensConfigWithId = {
  id: 'normalizedLoad1m',
  chartType: 'xy',
  title: formulas.normalizedLoad1m.label ?? '',
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.normalizedLoad1m],
    },
    {
      type: 'reference',
      yAxis: [
        {
          value: '1',
        },
      ],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const cpuUsageMetric: LensConfigWithId = {
  id: 'cpuUsage',
  chartType: 'metric',
  title: formulas.cpuUsage.label ?? '',
  trendLine: true,
  ...formulas.cpuUsage,
};

const normalizedLoad1mMetric: LensConfigWithId = {
  id: 'normalizedLoad1m',
  chartType: 'metric',
  title: formulas.normalizedLoad1m.label ?? '',
  trendLine: true,
  ...formulas.normalizedLoad1m,
};

export const cpu = {
  xy: {
    cpuUsageBreakdown,
    loadBreakdown,
    cpuUsage: cpuUsageXY,
    normalizedLoad1m: normalizedLoad1mXY,
  },
  metric: {
    cpuUsage: cpuUsageMetric,
    normalizedLoad1m: normalizedLoad1mMetric,
  },
} as const;
