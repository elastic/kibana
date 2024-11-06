/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, uniq } from 'lodash';
import { ElasticsearchClient } from '@kbn/core/server';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export async function getDataStreamsForQuery({
  esClient,
  index,
  query,
}: {
  esClient: ElasticsearchClient;
  index: string | string[];
  query: QueryDslQueryContainer;
}) {
  const response = await esClient.search({
    track_total_hits: false,
    index,
    size: 0,
    terminate_after: 1,
    timeout: '1ms',
    aggs: {
      indices: {
        terms: {
          field: '_index',
          size: 10000,
        },
      },
    },
    query: {
      bool: {
        filter: [
          query,
          {
            bool: {
              must_not: {
                terms: {
                  _tier: ['data_frozen'],
                },
              },
            },
          },
        ],
      },
    },
  });

  if (!response.aggregations) {
    return [];
  }

  const indices = response.aggregations.indices as { buckets: Array<{ key: string }> };

  const allIndices = indices.buckets.map((bucket) => bucket.key) ?? [];

  if (!allIndices.length) {
    return [];
  }

  const resolveIndexResponse = await esClient.indices.resolveIndex({
    name: allIndices,
  });

  const dataStreams = uniq(
    compact(await resolveIndexResponse.indices.flatMap((idx) => idx.data_stream))
  );

  return dataStreams;
}
