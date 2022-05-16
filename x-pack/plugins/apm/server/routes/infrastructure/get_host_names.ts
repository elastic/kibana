/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { HOST_NAME } from '../../../common/elasticsearch_fieldnames';

interface Aggs extends estypes.AggregationsMultiBucketAggregateBase {
  buckets: Array<{
    key: string;
    key_as_string?: string;
  }>;
}

export const getHostNames = async ({
  esClient,
  containerIds,
  index,
  start,
  end,
}: {
  esClient: ElasticsearchClient;
  containerIds: string[];
  index: string;
  start: number;
  end: number;
}) => {
  const response = await esClient.search<unknown, { hostNames: Aggs }>({
    index: [index],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: {
                'container.id': containerIds,
              },
            },
            {
              terms: {
                'event.dataset': ['kubernetes.container'],
              },
            },
            ...rangeQuery(start, end),
          ],
        },
      },
      aggs: {
        hostNames: {
          terms: {
            field: HOST_NAME,
            size: 500,
          },
        },
      },
    },
  });

  return {
    hostNames:
      response.aggregations?.hostNames?.buckets.map(
        (bucket) => bucket.key as string
      ) ?? [],
  };
};
