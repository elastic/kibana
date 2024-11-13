/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AggregationsMinAggregate } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

/**
 * Retrieves the oldest signal timestamp across all outdated indices
 */
export const getOldestSignalTimestamp = async ({
  esClient,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string[];
}): Promise<string | undefined> => {
  const response = await esClient.search<unknown, { min_timestamp: AggregationsMinAggregate }>({
    index,
    size: 0,
    body: {
      aggs: {
        min_timestamp: {
          min: {
            field: '@timestamp',
          },
        },
      },
    },
  });

  const minTimestamp = response.aggregations?.min_timestamp?.value_as_string;

  return minTimestamp;
};
