/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { LensMetricConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { createDashboardModel } from '../../../create_dashboard_model';
import { createBasicCharts } from '../charts';

const AVERAGE = i18n.translate('xpack.metricsData.assetDetails.overview.kpi.subtitle.average', {
  defaultMessage: 'Average',
});

export const kpi = {
  get: ({
    metricsDataViewId,
    options,
  }: {
    metricsDataViewId?: string;
    options?: Pick<LensMetricConfig, 'subtitle' | 'seriesColor'>;
  }) => {
    const { cpuUsage, diskUsage, memoryUsage, normalizedLoad1m } = createBasicCharts({
      chartType: 'metric',
      fromFormulas: ['cpuUsage', 'normalizedLoad1m', 'memoryUsage', 'diskUsage'],
      chartConfig: {
        trendLine: true,
        subtitle: options?.subtitle ?? AVERAGE,
        seriesColor: options?.seriesColor,
      },
      dataViewId: metricsDataViewId,
    });

    return createDashboardModel({
      charts: [cpuUsage, normalizedLoad1m, memoryUsage, diskUsage].map((p) => ({
        ...p,
        decimals: 1,
      })),
    });
  },
};
