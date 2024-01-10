/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '../../../../types';

export const cpu: MetricsUIAggregation = {
  cpu_with_limit: {
    avg: {
      field: 'kubernetes.pod.cpu.usage.limit.pct',
    },
  },
  cpu_without_limit: {
    avg: {
      field: 'kubernetes.pod.cpu.usage.node.pct',
    },
  },
  cpu: {
    bucket_script: {
      buckets_path: {
        with_limit: 'cpu_with_limit',
        without_limit: 'cpu_without_limit',
      },
      script: {
        source: 'params.with_limit > 0.0 ? params.with_limit : params.without_limit',
        lang: 'painless',
      },
      gap_policy: 'skip',
    },
  },
};
