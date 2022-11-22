/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsMultiBucketAggregateBase,
  AggregationsStringRareTermsBucketKeys,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { ElasticsearchClient } from '@kbn/core/server';

import { MlInferenceHistoryResponse } from '../../../../../common/types/pipelines';

export const fetchMlInferencePipelineHistory = async (
  client: ElasticsearchClient,
  index: string
): Promise<MlInferenceHistoryResponse> => {
  const ingestPipelineProcessorsResult = await client.search<
    unknown,
    {
      inference_processors: AggregationsMultiBucketAggregateBase<AggregationsStringRareTermsBucketKeys>;
    }
  >({
    aggs: {
      inference_processors: {
        terms: {
          field: '_ingest.processors.pipeline.enum',
          size: 100,
        },
      },
    },
    index,
    size: 0,
  });

  const processorBuckets =
    ingestPipelineProcessorsResult.aggregations?.inference_processors.buckets;
  if (!processorBuckets) {
    return { history: [] };
  }
  const bucketsList = Array.isArray(processorBuckets)
    ? processorBuckets
    : Object.values(processorBuckets);
  return {
    history: bucketsList.map((bucket) => ({
      doc_count: bucket.doc_count,
      pipeline: bucket.key,
    })),
  };
};
