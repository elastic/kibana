/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { MalformedDocs } from '../../../common/api_types';
import {
  DATA_STREAM_DATASET,
  DATA_STREAM_NAMESPACE,
  DATA_STREAM_TYPE,
  _IGNORED,
} from '../../../common/es_fields';
import { DataStreamTypes } from '../../types/data_stream';
import { createDatasetQualityESClient, wildcardQuery } from '../../utils';

export async function getMalformedDocsPaginated(options: {
  esClient: ElasticsearchClient;
  type?: DataStreamTypes;
  start: number;
  end: number;
  datasetQuery?: string;
  after?: {
    dataset: string;
    namespace: string;
  };
  prevResults?: MalformedDocs[];
}): Promise<MalformedDocs[]> {
  const { esClient, type = 'logs', datasetQuery, start, end, after, prevResults = [] } = options;

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
          malformed: {
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

  const currMalformedDocs =
    response.aggregations?.datasets.buckets.map((bucket) => ({
      dataset: `${type}-${bucket.key.dataset}-${bucket.key.namespace}`,
      percentage: (bucket.malformed.doc_count * 100) / bucket.doc_count,
    })) ?? [];

  const malformedDocs = [...prevResults, ...currMalformedDocs];

  if (response.aggregations?.datasets.after_key) {
    return getMalformedDocsPaginated({
      esClient,
      type,
      start,
      end,
      datasetQuery,
      after: {
        dataset: response.aggregations?.datasets.after_key.dataset as string,
        namespace: response.aggregations?.datasets.after_key.namespace as string,
      },
      prevResults: malformedDocs,
    });
  }

  return malformedDocs;
}
