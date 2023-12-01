/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { StaticValueConfig, XYChartModel } from '@kbn/lens-embeddable-utils';
import { formulas } from '../formulas';
import type { ChartArgs } from './types';

export const REFERENCE_LINE: StaticValueConfig = {
  value: '1',
  format: {
    id: 'percent',
    params: {
      decimals: 0,
    },
  },
  color: '#6092c0',
};

export const cpuUsageBreakdown = {
  get: ({ dataView }: ChartArgs): XYChartModel => ({
    id: 'cpuUsageBreakdown',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.cpuUsage', {
      defaultMessage: 'CPU Usage',
    }),
    layers: [
      {
        data: [
          formulas.cpuUsageIowait,
          formulas.cpuUsageIrq,
          formulas.cpuUsageNice,
          formulas.cpuUsageSoftirq,
          formulas.cpuUsageSteal,
          formulas.cpuUsageUser,
          formulas.cpuUsageSystem,
        ],
        options: {
          seriesType: 'area_stacked',
        },
        layerType: 'data',
      },
    ],
    visualizationType: 'lnsXY',
    dataView,
  }),
};

export const normalizedLoad1m = {
  get: ({ dataView }: ChartArgs): XYChartModel => ({
    id: 'normalizedLoad1m',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.normalizedLoad1m', {
      defaultMessage: 'Normalized Load',
    }),
    layers: [
      { data: [formulas.normalizedLoad1m], layerType: 'data' },
      { data: [REFERENCE_LINE], layerType: 'referenceLine' },
    ],
    visualizationType: 'lnsXY',
    dataView,
  }),
};

export const loadBreakdown = {
  get: ({ dataView }: ChartArgs): XYChartModel => ({
    id: 'loadBreakdown',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.load', {
      defaultMessage: 'Load',
    }),
    layers: [
      {
        data: [formulas.load1m, formulas.load5m, formulas.load15m],
        options: {
          seriesType: 'area',
        },
        layerType: 'data',
      },
    ],
    visualizationType: 'lnsXY',
    dataView,
  }),
};
