/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsMultiBucketAggregateBase,
  AggregationsStringRareTermsBucketKeys,
} from '@elastic/elasticsearch/lib/api/types';

import { ElasticsearchClient } from '@kbn/core/server';

import { MlInferenceError } from '../../../../../common/types/pipelines';

export interface ErrorAggregationBucket extends AggregationsStringRareTermsBucketKeys {
  max_error_timestamp: {
    value: number | null;
    value_as_string?: string;
  };
}

/**
 * Fetches an aggregate of distinct ML inference errors from the target index, along with the most
 * recent error's timestamp and affected document count for each bucket.
 * @param indexName the index to get the errors from.
 * @param esClient the Elasticsearch Client to use to fetch the errors.
 */
export const getMlInferenceErrors = async (
  indexName: string,
  esClient: ElasticsearchClient
): Promise<MlInferenceError[]> => {
  const searchResult = await esClient.search<
    unknown,
    {
      errors: AggregationsMultiBucketAggregateBase<ErrorAggregationBucket>;
    }
  >({
    index: indexName,
    body: {
      aggs: {
        errors: {
          terms: {
            field: '_ingest.inference_errors.message.enum',
            order: {
              max_error_timestamp: 'desc',
            },
            size: 20,
          },
          aggs: {
            max_error_timestamp: {
              max: {
                field: '_ingest.inference_errors.timestamp',
              },
            },
          },
        },
      },
      size: 0,
    },
  });

  const errorBuckets = searchResult.aggregations?.errors.buckets;
  if (!errorBuckets) {
    return [];
  }

  // Buckets are either in an array or in a Record, we transform them to an array
  const buckets = Array.isArray(errorBuckets) ? errorBuckets : Object.values(errorBuckets);

  return buckets.map((bucket) => ({
    message: bucket.key,
    doc_count: bucket.doc_count,
    timestamp: bucket.max_error_timestamp?.value_as_string,
  }));
};
