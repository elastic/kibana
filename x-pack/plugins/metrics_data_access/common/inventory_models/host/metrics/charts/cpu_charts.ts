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
    fittingFunction: 'Linear',
    legend: {
      position: 'bottom',
      show: true,
    },
    yBounds: {
      mode: 'custom',
      lowerBound: 0,
      upperBound: 1,
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
