/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '../../../types';
export const rxNew: MetricsUIAggregation = {
  rx_sum: {
    sum: {
      field: 'host.network.ingress.bytes',
    },
  },
  rx_min_timestamp: {
    filter: {
      exists: {
        field: 'host.network.ingress.bytes',
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
  rx_max_timestamp: {
    filter: {
      exists: {
        field: 'host.network.ingress.bytes',
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
  rxNew: {
    bucket_script: {
      buckets_path: {
        value: 'rx_sum',
        minTime: 'rx_min_timestamp>min',
        maxTime: 'rx_max_timestamp>max',
      },
      script: {
        source: '(params.value / ((params.maxTime - params.minTime) / 1000))',
        lang: 'painless',
      },
      gap_policy: 'skip',
    },
  },
};
