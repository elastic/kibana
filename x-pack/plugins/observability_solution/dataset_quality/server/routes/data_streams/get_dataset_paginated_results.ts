/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { DataStreamType } from '../../../common/types';
import { DATA_STREAM_TYPE } from '../../../common/es_fields';
import { createDatasetQualityESClient } from '../../utils';

interface ResultBucket {
  dataset: string;
  count: number;
}

interface Dataset {
  dataset: string;
  namespace: string;
}

const SIZE_LIMIT = 10000;

export async function getDatasetPaginatedResults(options: {
  esClient: ElasticsearchClient;
  type: DataStreamType;
  start: number;
  end: number;
  after?: Dataset;
  prevResults?: ResultBucket[];
}): Promise<ResultBucket[]> {
  const { esClient, type, start, end, after, prevResults = [] } = options;

  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const filter = [...rangeQuery(start, end), ...termQuery(DATA_STREAM_TYPE, type)];

  const aggs = (afterKey?: { dataset: string; namespace: string }) => ({
    datasets: {
      composite: {
        ...(afterKey ? { after: afterKey } : {}),
        size: SIZE_LIMIT,
        sources: [
          { dataset: { terms: { field: 'data_stream.dataset' } } },
          { namespace: { terms: { field: 'data_stream.namespace' } } },
        ],
      },
    },
  });

  const response = await datasetQualityESClient.search({
    index: `${type}-*-*`,
    size: 0,
    query: {
      bool: {
        filter,
      },
    },
    aggs: aggs(after),
  });

  const currResults =
    response.aggregations?.datasets.buckets.map((bucket) => ({
      dataset: `${type}-${bucket.key.dataset}-${bucket.key.namespace}`,
      count: bucket.doc_count,
    })) ?? [];

  const results = [...prevResults, ...currResults];

  if (
    response.aggregations?.datasets.after_key &&
    response.aggregations?.datasets.buckets.length === SIZE_LIMIT
  ) {
    return getDatasetPaginatedResults({
      esClient,
      type,
      start,
      end,
      after:
        (response.aggregations?.datasets.after_key as {
          dataset: string;
          namespace: string;
        }) || after,
      prevResults: results,
    });
  }

  return results;
}
