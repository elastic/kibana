/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDashboardModel } from '../../../create_dashboard_model';
import { createBasicCharts, normalizedLoad1m } from '../charts';

export const hostsView = {
  get: ({ metricsDataViewId }: { metricsDataViewId?: string }) => {
    const {
      memoryUsage,
      memoryFree,
      diskSpaceAvailable,
      diskIORead,
      diskIOWrite,
      diskReadThroughput,
      diskWriteThroughput,
      rx,
      tx,
    } = createBasicCharts({
      chartType: 'xy',
      fromFormulas: [
        'memoryUsage',
        'memoryFree',
        'diskSpaceAvailable',
        'diskIORead',
        'diskIOWrite',
        'diskReadThroughput',
        'diskWriteThroughput',
        'rx',
        'tx',
      ],
      chartConfig: {
        layerConfig: {
          breakdown: {
            field: 'host.name',
            type: 'topValues',
            size: 20,
          },
        },
        fittingFunction: 'Linear',
        ...(metricsDataViewId
          ? {
              dataset: {
                index: metricsDataViewId,
              },
            }
          : {}),
      },
    });

    const { cpuUsage, diskUsage } = createBasicCharts({
      chartType: 'xy',
      fromFormulas: ['cpuUsage', 'diskUsage'],
      chartConfig: {
        layerConfig: {
          breakdown: {
            field: 'host.name',
            type: 'topValues',
            size: 20,
          },
        },
        yBounds: {
          mode: 'custom',
          lowerBound: 0,
          upperBound: 1,
        },
        fittingFunction: 'Linear',
        ...(metricsDataViewId
          ? {
              dataset: {
                index: metricsDataViewId,
              },
            }
          : {}),
      },
    });

    return createDashboardModel({
      charts: [
        cpuUsage,
        normalizedLoad1m.get({ dataViewId: metricsDataViewId }),
        memoryUsage,
        memoryFree,
        diskUsage,
        diskSpaceAvailable,
        diskIORead,
        diskIOWrite,
        diskReadThroughput,
        diskWriteThroughput,
        rx,
        tx,
      ],
    });
  },
};
