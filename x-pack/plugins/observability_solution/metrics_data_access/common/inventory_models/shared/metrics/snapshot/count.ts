/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '../../../types';

export const count: MetricsUIAggregation = {
  count: {
    bucket_script: {
      buckets_path: { count: '_count' },
      script: {
        source: 'count * 1',
        lang: 'expression',
      },
      gap_policy: 'skip',
    },
  },
};
