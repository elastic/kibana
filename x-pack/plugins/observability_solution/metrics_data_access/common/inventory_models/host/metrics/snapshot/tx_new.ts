/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '../../../types';
export const txNew: MetricsUIAggregation = {
  tx_sum: {
    sum: {
      field: 'host.network.egress.bytes',
    },
  },
  tx_min_timestamp: {
    filter: {
      exists: {
        field: 'host.network.egress.bytes',
      },
    },
    aggs: {
      min: {
        min: {
          field: '@timestamp',
        },
      },
    },
  },
  tx_max_timestamp: {
    filter: {
      exists: {
        field: 'host.network.egress.bytes',
      },
    },
    aggs: {
      max: {
        max: {
          field: '@timestamp',
        },
      },
    },
  },
  txNew: {
    bucket_script: {
      buckets_path: {
        value: 'tx_sum',
        minTime: 'tx_min_timestamp>min',
        maxTime: 'tx_max_timestamp>max',
      },
      script: {
        source: '(params.value / ((params.maxTime - params.minTime) / 1000))',
        lang: 'painless',
      },
      gap_policy: 'skip',
    },
  },
};
