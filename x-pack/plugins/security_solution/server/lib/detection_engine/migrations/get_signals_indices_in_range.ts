/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';

interface IndexesResponse {
  aggregations: {
    indexes: {
      buckets: Array<{
        key: string;
      }>;
    };
  };
}

export const getSignalsIndicesInRange = async ({
  esClient,
  from,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string[];
  from: string;
}): Promise<string[]> => {
  if (index.length === 0) {
    return [];
  }

  const response = await esClient.search<IndexesResponse>({
    index,
    body: {
      aggs: {
        indexes: {
          terms: {
            field: '_index',
          },
        },
      },
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: from,
                  lte: 'now',
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
        },
      },
      size: 0,
    },
  });

  return response.body.aggregations.indexes.buckets.map((bucket) => bucket.key);
};
