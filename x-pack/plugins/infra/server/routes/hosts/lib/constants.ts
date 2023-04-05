/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

export const BUCKET_KEY = 'host.name';
export const METADATA_AGGREGATION_NAME = 'metadata';
export const FILTER_AGGREGATION_SUB_AGG_NAME = 'result';
export const SORT_BY_AGGREGATION_NAME = 'sortBy';

export const METADATA_AGGREGATION: Record<string, estypes.AggregationsAggregationContainer> = {
  [METADATA_AGGREGATION_NAME]: {
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
