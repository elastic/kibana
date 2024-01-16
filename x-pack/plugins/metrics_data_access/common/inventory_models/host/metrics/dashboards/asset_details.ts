/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createDashboardModel } from '../../../create_dashboard_model';
import {
  createBasicCharts,
  cpuUsageBreakdown,
  diskSpaceUsageAvailable,
  diskUsageByMountPoint,
  diskIOReadWrite,
  diskThroughputReadWrite,
  memoryUsageBreakdown,
  normalizedLoad1m,
  loadBreakdown,
  rxTx,
} from '../charts';

export const assetDetails = {
  get: ({
    metricsDataViewId,
    logsDataViewId,
  }: {
    metricsDataViewId?: string;
    logsDataViewId?: string;
  }) => {
    const { cpuUsage, memoryUsage } = createBasicCharts({
      chartType: 'xy',
      formFormulas: ['cpuUsage', 'memoryUsage'],
      chartConfig: {
        fittingFunction: 'Linear',
        yBounds: {
          mode: 'custom',
          lowerBound: 0,
          upperBound: 1,
        },
        ...(metricsDataViewId
          ? {
              dataset: {
                index: metricsDataViewId,
              },
            }
          : {}),
      },
    });

    const { logRate } = createBasicCharts({
      chartType: 'xy',
      formFormulas: ['logRate'],
      chartConfig: {
        fittingFunction: 'Linear',
        ...(logsDataViewId
          ? {
              dataset: {
                index: logsDataViewId,
              },
            }
          : {}),
      },
    });

    return createDashboardModel({
      charts: [
        cpuUsage,
        cpuUsageBreakdown.get({ dataViewId: metricsDataViewId }),
        memoryUsage,
        memoryUsageBreakdown.get({ dataViewId: metricsDataViewId }),
        normalizedLoad1m.get({ dataViewId: metricsDataViewId }),
        loadBreakdown.get({ dataViewId: metricsDataViewId }),
        logRate,
        diskSpaceUsageAvailable.get({ dataViewId: metricsDataViewId }),
        diskUsageByMountPoint.get({ dataViewId: metricsDataViewId }),
        diskThroughputReadWrite.get({ dataViewId: metricsDataViewId }),
        diskIOReadWrite.get({ dataViewId: metricsDataViewId }),
        rxTx.get({ dataViewId: metricsDataViewId }),
      ],
    });
  },
};
