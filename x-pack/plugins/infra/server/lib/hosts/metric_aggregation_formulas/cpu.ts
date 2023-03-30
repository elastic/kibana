/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsMetricsAggregationQueryConfig } from '../types';

export const cpu: HostsMetricsAggregationQueryConfig = {
  runtimeField: {
    cpu_usage: {
      type: 'double',
      script: `
        emit((doc['system.cpu.user.pct'].value + doc['system.cpu.system.pct'].value) / (doc['system.cpu.cores'].value)); 
      `,
    },
  },
  aggregation: {
    cpu: {
      filter: {
        bool: {
          must: [
            {
              exists: {
                field: 'system.cpu.user.pct',
              },
            },
            {
              exists: {
                field: 'system.cpu.system.pct',
              },
            },
            {
              exists: {
                field: 'system.cpu.cores',
              },
            },
          ],
        },
      },
      aggs: {
        result: {
          avg: {
            field: 'cpu_usage',
          },
        },
      },
    },
  },
};
