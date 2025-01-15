/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, uniq } from 'lodash';
import { ElasticsearchClient } from '@kbn/core/server';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { errors } from '@elastic/elasticsearch';
import pLimit from 'p-limit';

export async function getDataStreamsForQuery({
  esClient,
  index,
  query,
}: {
  esClient: ElasticsearchClient;
  index: string | string[];
  query: QueryDslQueryContainer;
}) {
  const chunks: string[][] = [];

  let currentChunk: string[] = [];
  let currentChunkLength = 0;

  chunks.push(currentChunk);

  const MAX_CHUNK_LENGTH = 2048;

  for (const currentIndex of castArray(index)) {
    const nextLength = currentChunkLength + currentIndex.length + 1;
    if (nextLength <= MAX_CHUNK_LENGTH) {
      currentChunk.push(currentIndex);
      currentChunkLength = nextLength;
    } else {
      currentChunk = [currentIndex];
      chunks.push(currentChunk);
      currentChunkLength = currentIndex.length;
    }
  }

  const limiter = pLimit(5);

  const allDataStreams = await Promise.all(
    chunks.map(async (chunk) => {
      return limiter(async () => {
        const response = await esClient
          .search({
            track_total_hits: false,
            index: chunk,
            size: 0,
            terminate_after: 1,
            timeout: '1ms',
            allow_no_indices: true,
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
          })
          .catch((error) => {
            if (error instanceof errors.ResponseError && error.statusCode === 404) {
              return undefined;
            }
            throw error;
          });

        if (!response?.aggregations) {
          return [];
        }

        const indices = response.aggregations.indices as { buckets: Array<{ key: string }> };

        const allIndices = indices.buckets.map((bucket) => bucket.key) ?? [];

        if (!allIndices.length) {
          return [];
        }

        const allResolvedIndicesOrDataStreams = allIndices.map((currentIndex) => {
          return currentIndex.replace(/((?:.*):)?\.ds-(.*)-\d{4}\.\d{2}\.\d{2}-\d{6}/, '$1$2');
        });

        const dataStreams = uniq(allResolvedIndicesOrDataStreams);

        return dataStreams;
      });
    })
  );

  return allDataStreams.flat();
}
