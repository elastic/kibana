/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsMetricsAggregationQueryConfig } from '../types';

const RUNTIME_FIELD_NAME = 'cpu_usage';

export const cpu: HostsMetricsAggregationQueryConfig = {
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
  runtimeField: {
    [RUNTIME_FIELD_NAME]: {
      type: 'double',
      script: `
        emit((doc['system.cpu.user.pct'].value + doc['system.cpu.system.pct'].value) / (doc['system.cpu.cores'].value)); 
      `,
    },
  },
  aggregation: {
    avg: {
      field: RUNTIME_FIELD_NAME,
    },
  },
};
