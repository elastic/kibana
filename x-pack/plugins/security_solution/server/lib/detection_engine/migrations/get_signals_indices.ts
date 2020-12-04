/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';

/* TODO do we need any other restrictions on this search?
  we're using the results to:
    * Update their settings
    * run an update_by_query
    * run update_by scripts
*/

interface IndexesResponse {
  aggregations: {
    indexes: {
      buckets: Array<{
        key: string;
      }>;
    };
  };
}
interface GetSignalsIndices {
  esClient: ElasticsearchClient;
  index: string;
  from: string;
}

export const getSignalsIndices = async ({
  esClient,
  from,
  index,
}: GetSignalsIndices): Promise<string[]> => {
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
