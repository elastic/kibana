/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SearchResponse, IndicesStatsResponse } from '@elastic/elasticsearch/lib/api/types';

export const getAggregationResultMock = ({
  user,
  host,
}: {
  user: number;
  host: number;
}): SearchResponse<
  never,
  {
    user_name: {
      value: number;
    };
    host_name: {
      value: number;
    };
  }
> => ({
  took: 171,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: { value: 10000, relation: 'gte' }, max_score: null, hits: [] },
  aggregations: { user_name: { value: user }, host_name: { value: host } },
});

export const getStatsResultMock = ({ size }: { size: number }): IndicesStatsResponse => ({
  _shards: { total: 2, successful: 1, failed: 0 },
  _all: {
    primaries: {
      docs: { count: 200000, deleted: 0 },
      shard_stats: { total_count: 1 },
      store: {
        size_in_bytes: size,
        total_data_set_size_in_bytes: size,
        reserved_in_bytes: 0,
      },
    },
  },
});
