/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { QueryDslBoolQuery } from '@elastic/elasticsearch/lib/api/types';
import { DataStreamDocsStat } from '../../../common/api_types';
import { createDatasetQualityESClient } from '../../utils';

interface Dataset {
  type: string;
  dataset: string;
  namespace: string;
}

const SIZE_LIMIT = 10000;

export async function getAggregatedDatasetPaginatedResults(options: {
  esClient: ElasticsearchClient;
  index: string;
  start: number;
  end: number;
  query?: QueryDslBoolQuery;
  after?: Dataset;
  prevResults?: DataStreamDocsStat[];
}): Promise<DataStreamDocsStat[]> {
  const { esClient, index, query, start, end, after, prevResults = [] } = options;

  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const aggs = (afterKey?: Dataset) => ({
    datasets: {
      composite: {
        ...(afterKey ? { after: afterKey } : {}),
        size: SIZE_LIMIT,
        sources: [
          { type: { terms: { field: 'data_stream.type' } } },
          { dataset: { terms: { field: 'data_stream.dataset' } } },
          { namespace: { terms: { field: 'data_stream.namespace' } } },
        ],
      },
    },
  });

  const bool = {
    ...query,
    filter: [
      ...(query?.filter ? (Array.isArray(query.filter) ? query.filter : [query.filter]) : []),
      ...[...rangeQuery(start, end)],
    ],
  };

  const response = await datasetQualityESClient.search({
    index,
    size: 0,
    query: {
      bool,
    },
    aggs: aggs(after),
  });

  const currResults =
    response.aggregations?.datasets.buckets.map((bucket) => ({
      dataset: `${bucket.key.type}-${bucket.key.dataset}-${bucket.key.namespace}`,
      count: bucket.doc_count,
    })) ?? [];

  const results = [...prevResults, ...currResults];

  if (
    response.aggregations?.datasets.after_key &&
    response.aggregations?.datasets.buckets.length === SIZE_LIMIT
  ) {
    return getAggregatedDatasetPaginatedResults({
      esClient,
      index,
      start,
      end,
      after:
        (response.aggregations?.datasets.after_key as {
          type: string;
          dataset: string;
          namespace: string;
        }) || after,
      prevResults: results,
    });
  }

  return results;
}
