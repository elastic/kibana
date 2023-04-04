/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsMetricsAggregationQueryConfig } from '../types';

export const memory: HostsMetricsAggregationQueryConfig = {
  filter: {
    bool: {
      filter: [
        {
          exists: {
            field: 'system.memory.actual.used.pct',
          },
        },
      ],
    },
  },
  aggregation: {
    avg: {
      field: 'system.memory.actual.used.pct',
    },
  },
};
