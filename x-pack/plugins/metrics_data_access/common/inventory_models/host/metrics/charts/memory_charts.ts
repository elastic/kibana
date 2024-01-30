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

export const memoryUsageBreakdown = {
  get: ({ dataViewId }: ChartArgs): LensConfigWithId => ({
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
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.metric.label.cache',
              {
                defaultMessage: 'Cache',
              }
            ),
          },
          {
            ...formulas.memoryUsed,
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.metric.label.used',
              {
                defaultMessage: 'Used',
              }
            ),
          },
          {
            ...formulas.memoryFreeExcludingCache,
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.metric.label.free',
              {
                defaultMessage: 'Free',
              }
            ),
          },
        ],
      },
    ],
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
