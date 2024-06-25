/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '../../../types';
export const tx: MetricsUIAggregation = {
  tx_avg: {
    avg: {
      field: 'host.network.egress.bytes',
    },
  },
  tx_period: {
    filter: {
      exists: {
        field: 'host.network.egress.bytes',
      },
    },
    aggs: {
      period: {
        max: {
          field: 'metricset.period',
        },
      },
    },
  },
  tx: {
    bucket_script: {
      buckets_path: {
        value: 'tx_avg',
        period: 'tx_period>period',
      },
      script: {
        source: 'params.value / (params.period / 1000)',
        lang: 'painless',
      },
      gap_policy: 'skip',
    },
  },
};
