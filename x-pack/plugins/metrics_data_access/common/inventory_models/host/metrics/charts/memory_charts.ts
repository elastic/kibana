/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';

export const memoryCharts = {
  xy: {
    memoryUsageBreakdown: {
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
    } as LensConfigWithId,
    memoryUsage: {
      id: 'memoryUsage',
      chartType: 'xy',
      title: formulas.memoryUsage.label ?? 'Memory Usage',
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [formulas.memoryUsage],
        },
      ],
      fittingFunction: 'Linear',
      legend: {
        show: false,
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
      yBounds: {
        mode: 'custom',
        lowerBound: 0,
        upperBound: 1,
      },
    } as LensConfigWithId,
    memoryFree: {
      id: 'memoryFree',
      chartType: 'xy',
      title: formulas.memoryFree.label,
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [formulas.memoryFree],
        },
      ],
      fittingFunction: 'Linear',
      legend: {
        show: false,
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
    } as LensConfigWithId,
  },
  metric: {
    memoryUsage: {
      id: 'memoryUsage',
      chartType: 'metric',
      title: formulas.memoryUsage.label ?? 'Memory Usage',
      trendLine: true,
      ...formulas.memoryUsage,
    } as LensConfigWithId,
  },
};
