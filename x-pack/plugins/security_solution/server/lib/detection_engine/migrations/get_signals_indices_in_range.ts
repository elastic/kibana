/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

/**
 * Retrieves the list of indices containing signals that fall between now and
 * the given date. This is most relevant to signals migrations, where we want
 * to scope the number of indexes/documents that we migrate.
 *
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param from date math string representing the start of the range
 * @param index name(s) of the signals index(es)
 *
 * @returns an array of index names
 */
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

  const response = await esClient.search({
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

  const aggs = response.aggregations as IndexesResponse['aggregations'];
  return aggs.indexes.buckets.map((bucket) => bucket.key);
};
