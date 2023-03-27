/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HostsAggregationQuery } from '../types';

export const rx: HostsAggregationQuery = {
  runtimeField: {
    rx_bytes_per_period: {
      type: 'double',
      script: `
          emit((doc['host.network.ingress.bytes'].value/(doc['metricset.period'].value / 1000)));
        `,
    },
  },
  aggregation: {
    rx: {
      filter: {
        exists: {
          field: 'host.network.ingress.bytes',
        },
      },
      aggs: {
        result: {
          avg: {
            field: 'rx_bytes_per_period',
          },
        },
      },
    },
  },
};
