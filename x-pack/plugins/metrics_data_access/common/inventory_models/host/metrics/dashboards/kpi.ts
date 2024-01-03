/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
// import type { MetricLayerOptions } from '@kbn/lens-embeddable-utils';
import { createDashboardModel } from '../../../create_dashboard_model';
import { createBasicCharts } from '../charts';

const AVERAGE = i18n.translate('xpack.metricsData.assetDetails.overview.kpi.subtitle.average', {
  defaultMessage: 'Average',
});

export const kpi = {
  get: ({ metricsDataView, options }: { metricsDataView?: DataView; options?: any }) => {
    const { cpuUsage, diskUsage, memoryUsage, normalizedLoad1m } = createBasicCharts({
      chartType: 'metric',
      formulaIds: ['cpuUsage', 'diskUsage', 'memoryUsage', 'normalizedLoad1m'],
      options: {
        trendLine: true,
        label: AVERAGE,
        dataset: {
          timeFieldName: metricsDataView?.getTimeField()?.displayName ?? '@timestamp',
          index: metricsDataView?.getIndexPattern() ?? 'metrics-*',
        },
      },
    });

    return createDashboardModel({
      charts: [cpuUsage, diskUsage, memoryUsage, normalizedLoad1m],
    });
  },
};
