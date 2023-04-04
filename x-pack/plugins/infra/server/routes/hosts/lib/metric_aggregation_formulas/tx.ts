/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HostsMetricsAggregationQueryConfig } from '../types';

export const tx: HostsMetricsAggregationQueryConfig = {
  filter: {
    bool: {
      filter: [
        {
          exists: {
            field: 'host.network.egress.bytes',
          },
        },
      ],
    },
  },
  runtimeField: {
    tx_bytes_per_period: {
      type: 'double',
      script: `
          emit((doc['host.network.egress.bytes'].value/(doc['metricset.period'].value / 1000)));
        `,
    },
  },
  aggregation: {
    avg: {
      field: 'tx_bytes_per_period',
    },
  },
};
