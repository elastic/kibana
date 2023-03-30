/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsMetricsAggregationQueryConfig } from '../types';

export const diskLatency: HostsMetricsAggregationQueryConfig = {
  runtimeField: {
    disk_latency: {
      type: 'double',
      script: `
      emit((doc['system.diskio.write.time'].value + doc['system.diskio.read.time'].value) / ((doc['system.diskio.read.count'].value + doc['system.diskio.write.count'].value)));
    `,
    },
  },
  aggregation: {
    diskLatency: {
      filter: {
        bool: {
          must: [
            {
              exists: {
                field: 'system.diskio.read.time',
              },
            },
            {
              exists: {
                field: 'system.diskio.write.time',
              },
            },
            {
              exists: {
                field: 'system.diskio.read.count',
              },
            },
            {
              exists: {
                field: 'system.diskio.write.count',
              },
            },
          ],
        },
      },
      aggs: {
        result: {
          avg: {
            field: 'disk_latency',
          },
        },
      },
    },
  },
};
