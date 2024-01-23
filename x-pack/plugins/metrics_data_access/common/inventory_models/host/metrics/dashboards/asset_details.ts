/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataView } from '@kbn/data-views-plugin/common';
import type { XYVisualOptions } from '@kbn/lens-embeddable-utils';
import { createDashboardModel } from '../../../create_dashboard_model';
import {
  createBasicCharts,
  cpuUsageBreakdown,
  diskSpaceUsageAvailable,
  diskUsageByMountPoint,
  diskIOReadWrite,
  diskThroughputReadWrite,
  memoryUsageBreakdown,
  loadBreakdown,
  rxTx,
} from '../charts';

export const assetDetails = {
  get: ({
    metricsDataView,
    logsDataView,
  }: {
    metricsDataView?: DataView;
    logsDataView?: DataView;
  }) => {
    const commonVisualOptions: XYVisualOptions = {
      showDottedLine: true,
      missingValues: 'Linear',
    };

    const legend: XYVisualOptions = {
      legend: {
        isVisible: true,
        position: 'bottom',
      },
    };

    const { cpuUsage, memoryUsage, normalizedLoad1m } = createBasicCharts({
      visualizationType: 'lnsXY',
      formulaIds: ['cpuUsage', 'memoryUsage', 'normalizedLoad1m'],
      dataView: metricsDataView,
      visualOptions: commonVisualOptions,
    });

    const { logRate } = createBasicCharts({
      visualizationType: 'lnsXY',
      formulaIds: ['logRate'],
      dataView: logsDataView,
      visualOptions: commonVisualOptions,
    });

    return createDashboardModel({
      charts: [
        cpuUsage,
        {
          ...cpuUsageBreakdown.get({ dataView: metricsDataView }),
          visualOptions: { ...commonVisualOptions, ...legend },
        },
        memoryUsage,
        {
          ...memoryUsageBreakdown.get({ dataView: metricsDataView }),
          visualOptions: { ...commonVisualOptions, ...legend },
        },
        normalizedLoad1m,
        {
          ...loadBreakdown.get({ dataView: metricsDataView }),
          visualOptions: { ...commonVisualOptions, ...legend },
        },
        logRate,
        {
          ...diskSpaceUsageAvailable.get({ dataView: metricsDataView }),
          visualOptions: { ...commonVisualOptions, ...legend },
        },
        {
          ...diskUsageByMountPoint.get({ dataView: metricsDataView }),
          visualOptions: { ...commonVisualOptions, ...legend },
        },
        {
          ...diskThroughputReadWrite.get({ dataView: metricsDataView }),
          visualOptions: { ...commonVisualOptions, ...legend },
        },
        {
          ...diskIOReadWrite.get({ dataView: metricsDataView }),
          visualOptions: { ...commonVisualOptions, ...legend },
        },
        {
          ...rxTx.get({ dataView: metricsDataView }),
          visualOptions: { ...commonVisualOptions, ...legend },
        },
      ],
    });
  },
};
