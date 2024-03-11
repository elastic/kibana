/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { DEFAULT_DATASET_TYPE } from '../../../common/constants';
import { DataStreamType } from '../../../common/types';
import { DegradedDocs } from '../../../common/api_types';
import {
  DATA_STREAM_DATASET,
  DATA_STREAM_NAMESPACE,
  DATA_STREAM_TYPE,
  _IGNORED,
} from '../../../common/es_fields';
import { createDatasetQualityESClient, wildcardQuery } from '../../utils';

export async function getDegradedDocsPaginated(options: {
  esClient: ElasticsearchClient;
  type?: DataStreamType;
  start?: number;
  end?: number;
  datasetQuery?: string;
  after?: {
    dataset: string;
    namespace: string;
  };
  prevResults?: DegradedDocs[];
}): Promise<DegradedDocs[]> {
  const {
    esClient,
    type = DEFAULT_DATASET_TYPE,
    datasetQuery,
    start,
    end,
    after,
    prevResults = [],
  } = options;

  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const response = await datasetQualityESClient.search({
    index: '*',
    size: 0,
    query: {
      bool: {
        ...(datasetQuery
          ? {
              should: [
                ...wildcardQuery(DATA_STREAM_DATASET, datasetQuery),
                ...wildcardQuery(DATA_STREAM_NAMESPACE, datasetQuery),
              ],
              minimum_should_match: 1,
            }
          : {}),
        filter: [...rangeQuery(start, end), ...termQuery(DATA_STREAM_TYPE, type)],
      },
    },
    aggs: {
      datasets: {
        composite: {
          ...(after ? { after } : {}),
          size: 10000,
          sources: [
            { dataset: { terms: { field: DATA_STREAM_DATASET } } },
            { namespace: { terms: { field: DATA_STREAM_NAMESPACE } } },
          ],
        },
        aggs: {
          degraded: {
            filter: {
              exists: {
                field: _IGNORED,
              },
            },
          },
        },
      },
    },
  });

  const currDegradedDocs =
    response.aggregations?.datasets.buckets.map((bucket) => ({
      dataset: `${type}-${bucket.key.dataset}-${bucket.key.namespace}`,
      percentage: (bucket.degraded.doc_count * 100) / bucket.doc_count,
      count: bucket.degraded.doc_count,
    })) ?? [];

  const degradedDocs = [...prevResults, ...currDegradedDocs];

  if (response.aggregations?.datasets.after_key) {
    return getDegradedDocsPaginated({
      esClient,
      type,
      start,
      end,
      datasetQuery,
      after: {
        dataset: response.aggregations?.datasets.after_key.dataset as string,
        namespace: response.aggregations?.datasets.after_key.namespace as string,
      },
      prevResults: degradedDocs,
    });
  }

  return degradedDocs;
}
