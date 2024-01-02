/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import type { MetricLayerOptions } from '@kbn/lens-embeddable-utils';
import { createDashboardModel } from '../../../create_dashboard_model';
import { createBasicCharts } from '../charts';

const AVERAGE = i18n.translate('xpack.metricsData.assetDetails.overview.kpi.subtitle.average', {
  defaultMessage: 'Average',
});

export const kpi = {
  get: ({
    metricsDataView,
    options,
  }: {
    metricsDataView?: DataView;
    options?: MetricLayerOptions;
  }) => {
    const { cpuUsage, diskUsage, memoryUsage, normalizedLoad1m } = createBasicCharts({
      visualizationType: 'lnsMetric',
      formulaIds: ['cpuUsage', 'diskUsage', 'memoryUsage', 'normalizedLoad1m'],
      layerOptions: {
        showTrendLine: true,
        subtitle: AVERAGE,
        ...options,
      },
      dataView: metricsDataView,
    });

    return createDashboardModel({
      charts: [
        {
          ...cpuUsage,
          layers: {
            ...cpuUsage.layers,
            data: {
              ...cpuUsage.layers.data,
              format: cpuUsage.layers.data.format
                ? {
                    ...cpuUsage.layers.data.format,
                    params: {
                      decimals: 1,
                    },
                  }
                : undefined,
            },
          },
        },
        {
          ...normalizedLoad1m,
          layers: {
            ...normalizedLoad1m.layers,
            data: {
              ...normalizedLoad1m.layers.data,
              format: normalizedLoad1m.layers.data.format
                ? {
                    ...normalizedLoad1m.layers.data.format,
                    params: {
                      decimals: 1,
                    },
                  }
                : undefined,
            },
          },
        },

        {
          ...memoryUsage,
          layers: {
            ...memoryUsage.layers,
            data: {
              ...memoryUsage.layers.data,
              format: memoryUsage.layers.data.format
                ? {
                    ...memoryUsage.layers.data.format,
                    params: {
                      decimals: 1,
                    },
                  }
                : undefined,
            },
          },
        },
        {
          ...diskUsage,
          layers: {
            ...diskUsage.layers,
            data: {
              ...diskUsage.layers.data,
              format: diskUsage.layers.data.format
                ? {
                    ...diskUsage.layers.data.format,
                    params: {
                      decimals: 1,
                    },
                  }
                : undefined,
            },
          },
        },
      ],
    });
  },
};
