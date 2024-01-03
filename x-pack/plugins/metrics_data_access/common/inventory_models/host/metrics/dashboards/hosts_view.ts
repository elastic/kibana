/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
// import { XYChartModel, XYLayerOptions } from '@kbn/lens-embeddable-utils';
import { createDashboardModel } from '../../../create_dashboard_model';
import { createBasicCharts } from '../charts';

export const hostsView = {
  get: ({ metricsDataView }: { metricsDataView?: DataView }) => {
    // const commonVisualOptions: XYChartModel['visualOptions'] = {
    //   showDottedLine: true,
    //   missingValues: 'Linear',
    // };

    // const layerOptions: XYLayerOptions = {
    //   breakdown: {
    //     type: 'top_values',
    //     field: 'host.name',
    //     params: {
    //       size: 20,
    //     },
    //   },
    // };

    const {
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
    } = createBasicCharts({
      chartType: 'xy',
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
        'diskWriteThroughput',
        'rx',
        'tx',
      ],
      options: {
        dataset: {
          timeFieldName: metricsDataView?.getTimeField()?.displayName ?? '@timestamp',
          index: metricsDataView?.getIndexPattern() ?? 'metrics-*',
        },
      },
    });

    const { cpuUsage, normalizedLoad1m } = createBasicCharts({
      chartType: 'xy',
      formulaIds: ['cpuUsage', 'normalizedLoad1m'],
      options: {
        dataset: {
          timeFieldName: metricsDataView?.getTimeField()?.displayName ?? '@timestamp',
          index: metricsDataView?.getIndexPattern() ?? 'metrics-*',
        },
      },
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
