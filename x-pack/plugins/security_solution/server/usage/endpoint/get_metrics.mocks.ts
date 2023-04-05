/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { AggregationsAggregate } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const getUniqueEndpointCountMock = (): SearchResponse<
  unknown,
  Record<string, AggregationsAggregate>
> => ({
  took: 495,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    max_score: null,
    hits: [],
  },
  aggregations: {
    endpoint_count: { value: 3 },
  },
});
