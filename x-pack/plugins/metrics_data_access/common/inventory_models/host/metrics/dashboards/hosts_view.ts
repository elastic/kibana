/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensBreakdownConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { createDashboardModel } from '../../../create_dashboard_model';
import { createBasicCharts } from '../charts';

export const hostsView = {
  get: ({ metricsDataViewId }: { metricsDataViewId?: string }) => {
    const breakdown: LensBreakdownConfig = {
      field: 'host.name',
      type: 'topValues',
      size: 20,
    };

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
          breakdown,
        },
      },
      dataViewId: metricsDataViewId,
    });

    const { normalizedLoad1m } = createBasicCharts({
      chartType: 'xy',
      fromFormulas: ['normalizedLoad1m'],
      chartConfig: {
        layerConfig: {
          breakdown,
        },
      },
      dataViewId: metricsDataViewId,
    });
    normalizedLoad1m.layers.push({ type: 'reference', yAxis: [{ value: '1' }] });

    const { cpuUsage, diskUsage } = createBasicCharts({
      chartType: 'xy',
      fromFormulas: ['cpuUsage', 'diskUsage'],
      chartConfig: {
        layerConfig: {
          breakdown,
        },
        yBounds: {
          mode: 'custom',
          lowerBound: 0,
          upperBound: 1,
        },
      },
      dataViewId: metricsDataViewId,
    });

    return createDashboardModel({
      charts: [
        cpuUsage,
        normalizedLoad1m,
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
