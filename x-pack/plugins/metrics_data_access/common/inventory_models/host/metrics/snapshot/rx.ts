/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '../../../types';
export const rx: MetricsUIAggregation = {
  rx_avg: {
    avg: {
      field: 'host.network.ingress.bytes',
    },
  },
  rx_period: {
    filter: {
      exists: {
        field: 'host.network.ingress.bytes',
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
  rx: {
    bucket_script: {
      buckets_path: {
        value: 'rx_avg',
        period: 'rx_period>period',
      },
      script: {
        source: 'params.value / (params.period / 1000)',
        lang: 'painless',
      },
      gap_policy: 'skip',
    },
  },
};
