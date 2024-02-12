/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '../../../../types';

export const memory: MetricsUIAggregation = {
  memory_with_limit: {
    avg: {
      field: 'kubernetes.pod.memory.usage.limit.pct',
    },
  },
  memory_without_limit: {
    avg: {
      field: 'kubernetes.pod.memory.usage.node.pct',
    },
  },
  memory: {
    bucket_script: {
      buckets_path: {
        with_limit: 'memory_with_limit',
        without_limit: 'memory_without_limit',
      },
      script: {
        source: 'params.with_limit > 0.0 ? params.with_limit : params.without_limit',
        lang: 'painless',
      },
      gap_policy: 'skip',
    },
  },
};
