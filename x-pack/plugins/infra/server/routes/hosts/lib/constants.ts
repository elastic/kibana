/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { HostSortField } from '../../../../common/http_api/hosts';

export const BUCKET_KEY = 'host.name';
export const MAX_FILTERED_HOST_SIZE = 1000;
export const METADATA_FIELD = 'metadata';

export const AGGREGATION_NAME_BY_METRIC: Partial<Record<HostSortField, string>> = {
  name: '_key',
  cpu: 'cpu>result',
  diskLatency: 'diskLatency>result',
  rx: 'rx>result',
  tx: 'tx>result',
} as const;

export const METADATA_AGGREGATION: Record<string, estypes.AggregationsAggregationContainer> = {
  [METADATA_FIELD]: {
    top_metrics: {
      metrics: [
        {
          field: 'host.os.name',
        },
        {
          field: 'cloud.provider',
        },
      ],
      size: 1,
      sort: {
        '@timestamp': 'desc',
      },
    },
  },
};

// Arbitrary probability used in random sapmler agggregation.
// Set to a low value to improve performance.
// This could potentially return wrong results, and need adjustments.
export const RANDOM_SAMPLER_PROBABILITY = 0.1;
