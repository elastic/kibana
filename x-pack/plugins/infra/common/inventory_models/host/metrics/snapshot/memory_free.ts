/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '../../../types';
export const memoryFree: MetricsUIAggregation = {
  memory_total: {
    max: {
      field: 'system.memory.total',
    },
  },
  used_bytes: {
    avg: {
      field: 'system.memory.actual.used.bytes',
    },
  },
  memoryFree: {
    bucket_script: {
      buckets_path: {
        memoryTotal: 'memory_total',
        usedBytes: 'used_bytes',
      },
      script: {
        source: 'params.memoryTotal - params.usedBytes',
        lang: 'painless',
      },
      gap_policy: 'skip',
    },
  },
};
