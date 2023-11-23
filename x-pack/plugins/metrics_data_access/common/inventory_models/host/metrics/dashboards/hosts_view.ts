/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { ChartModel, XYLayerModel, XYLayerOptions } from '@kbn/lens-embeddable-utils';
import { createDashboardModel } from '../../../create_dashboard_model';
import { createBasicCharts } from '../charts';

export const hostsView = {
  get: ({ metricsDataView }: { metricsDataView: DataView }) => {
    const commonParams: Partial<ChartModel<XYLayerModel>> = {
      visualOptions: {
        showDottedLine: true,
        missingValues: 'Linear',
      },
    };

    const options: XYLayerOptions = {
      breakdown: {
        type: 'top_values',
        field: 'host.name',
        params: {
          size: 20,
        },
      },
    };

    const {
      memoryUsage,
      memoryFree,
      diskUsage,
      diskSpaceAvailable,
      diskIORead,
      diskIOWrite,
      diskReadThroughput,
      rx,
      tx,
    } = createBasicCharts({
      visualizationType: 'lnsXY',
      formulaIds: [
        'cpuUsage',
        'memoryUsage',
        'normalizedLoad1m',
        'memoryFree',
        'diskUsage',
        'diskSpaceAvailable',
        'diskIORead',
        'diskIOWrite',
        'diskReadThroughput',
        'rx',
        'tx',
      ],
      dataView: metricsDataView,
      extra: {
        options,
      },
      ...commonParams,
    });

    const { cpuUsage, normalizedLoad1m } = createBasicCharts({
      visualizationType: 'lnsXY',
      formulaIds: ['cpuUsage', 'normalizedLoad1m'],
      extra: {
        options,
      },
      visualOptions: {
        ...commonParams,
        yLeftExtent: {
          mode: 'dataBounds',
          lowerBound: 0,
          upperBound: 1,
        },
      },
      dataView: metricsDataView,
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
        rx,
        tx,
      ],
    });
  },
};
