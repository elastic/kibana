/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';
import type { ChartArgs } from './types';

export const cpuUsageBreakdown = {
  get: ({ dataViewId }: ChartArgs): LensConfigWithId => ({
    id: 'cpuUsageBreakdown',
    chartType: 'xy',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.cpuUsage', {
      defaultMessage: 'CPU Usage',
    }),
    layers: [
      formulas.cpuUsageIowait,
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
    emphasizeFitting: true,
    fittingFunction: 'Linear',
    legend: {
      position: 'bottom',
      show: true,
    },
    axisTitleVisibility: {
      showXAxisTitle: false,
      showYAxisTitle: false,
    },
    ...(dataViewId
      ? {
          dataset: {
            index: dataViewId,
          },
        }
      : {}),
  }),
};

export const normalizedLoad1m = {
  get: ({ dataViewId }: ChartArgs): LensConfigWithId => ({
    id: 'normalizedLoad1m',
    chartType: 'xy',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.normalizedLoad1m', {
      defaultMessage: 'Normalized Load',
    }),
    layers: [
      { seriesType: 'line', type: 'series', xAxis: '@timestamp', value: formulas.normalizedLoad1m },
      { type: 'reference', value: '1', color: '#6092c0' },
    ],
    emphasizeFitting: true,
    fittingFunction: 'Linear',
    legend: {
      show: false,
    },
    axisTitleVisibility: {
      showXAxisTitle: false,
      showYAxisTitle: false,
    },
    ...(dataViewId
      ? {
          dataset: {
            index: dataViewId,
          },
        }
      : {}),
  }),
};

export const loadBreakdown = {
  get: ({ dataViewId }: ChartArgs): LensConfigWithId => ({
    id: 'loadBreakdown',
    chartType: 'xy',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.load', {
      defaultMessage: 'Load',
    }),
    layers: [formulas.load1m, formulas.load5m, formulas.load15m].map((formula) => ({
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      value: formula,
    })),
    emphasizeFitting: true,
    fittingFunction: 'Linear',
    legend: {
      position: 'bottom',
      show: true,
    },
    axisTitleVisibility: {
      showXAxisTitle: false,
      showYAxisTitle: false,
    },
    ...(dataViewId
      ? {
          dataset: {
            index: dataViewId,
          },
        }
      : {}),
  }),
};
