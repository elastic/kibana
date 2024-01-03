/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensXYConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { formulas } from '../formulas';
import type { ChartArgs } from './types';

export const cpuUsageBreakdown = {
  get: ({ dataView }: ChartArgs): LensXYConfig => ({
    chartType: 'xy',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.cpuUsage', {
      defaultMessage: 'CPU Usage',
    }),
    layers: [
      formulas.cpuUsageUser,
      formulas.cpuUsageIrq,
      formulas.cpuUsageNice,
      formulas.cpuUsageSoftirq,
      formulas.cpuUsageSteal,
      formulas.cpuUsageUser,
      formulas.cpuUsageSystem,
    ].map((formula) => ({
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      value: formula,
    })),
  }),
};

export const normalizedLoad1m = {
  get: ({ dataView }: ChartArgs): LensXYConfig => ({
    chartType: 'xy',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.normalizedLoad1m', {
      defaultMessage: 'Normalized Load',
    }),
    layers: [
      { seriesType: 'line', type: 'series', xAxis: '@timestamp', value: formulas.normalizedLoad1m },
      { type: 'reference', value: '1', color: '#6092c0' },
    ],
  }),
};

export const loadBreakdown = {
  get: ({ dataView }: ChartArgs): LensXYConfig => ({
    chartType: 'xy',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.load', {
      defaultMessage: 'Load',
    }),
    layers: ['formulas.load1m', formulas.load5m, formulas.load15m].map((formula) => ({
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      value: formula,
    })),
  }),
};
