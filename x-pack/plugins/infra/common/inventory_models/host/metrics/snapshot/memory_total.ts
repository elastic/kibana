/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '../../../types';

export const memoryTotal: MetricsUIAggregation = {
  memory_total: {
    avg: {
      field: 'system.memory.total',
    },
  },
  memoryTotal: {
    bucket_script: {
      buckets_path: {
        memoryTotal: 'memory_total',
      },
      script: {
        source: 'params.memoryTotal',
        lang: 'painless',
      },
      gap_policy: 'skip',
    },
  },
};
