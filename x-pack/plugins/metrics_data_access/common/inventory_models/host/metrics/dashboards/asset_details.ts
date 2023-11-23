/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataView } from '@kbn/data-views-plugin/common';
import { ChartModel, XYLayerModel } from '@kbn/lens-embeddable-utils';
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
    const commonParams: Partial<ChartModel<XYLayerModel>> = {
      visualOptions: {
        showDottedLine: true,
        missingValues: 'Linear',
      },
    };

    const { cpuUsage, memoryUsage, normalizedLoad1m } = createBasicCharts({
      visualizationType: 'lnsXY',
      formulaIds: ['cpuUsage', 'memoryUsage', 'normalizedLoad1m'],
      dataView: metricsDataView,
      ...commonParams,
    });

    const { logRate } = createBasicCharts({
      visualizationType: 'lnsXY',
      formulaIds: ['logRate'],
      dataView: logsDataView,
      ...commonParams,
    });

    return createDashboardModel({
      charts: [
        cpuUsage,
        { ...cpuUsageBreakdown.get({ dataView: metricsDataView }), ...commonParams },
        memoryUsage,
        { ...memoryUsageBreakdown.get({ dataView: metricsDataView }), ...commonParams },
        normalizedLoad1m,
        { ...loadBreakdown.get({ dataView: metricsDataView }), ...commonParams },
        logRate,
        { ...diskSpaceUsageAvailable.get({ dataView: metricsDataView }), ...commonParams },
        { ...diskUsageByMountPoint.get({ dataView: metricsDataView }), ...commonParams },
        { ...diskThroughputReadWrite.get({ dataView: metricsDataView }), ...commonParams },
        { ...diskIOReadWrite.get({ dataView: metricsDataView }), ...commonParams },
        { ...rxTx.get({ dataView: metricsDataView }), ...commonParams },
      ],
    });
  },
};
