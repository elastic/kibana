/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { estypes } from '@elastic/elasticsearch';
import { SearchServiceParams } from '../../../../common/search_strategies/correlations/types';
import { getQueryWithParams } from './get_query_with_params';
import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';

export const getTransactionDurationRangesRequest = (
  params: SearchServiceParams,
  ranges: estypes.AggregationsAggregationRange[]
): estypes.SearchRequest => ({
  index: params.index,
  body: {
    query: getQueryWithParams({ params }),
    size: 0,
    aggs: {
      latency_ranges: {
        range: {
          field: TRANSACTION_DURATION,
          ranges,
        },
      },
    },
  },
});

/**
 * Compute the actual percentile bucket counts and actual fractions
 */
export const fetchTransactionDurationFractions = async (
  esClient: ElasticsearchClient,
  params: SearchServiceParams,
  ranges: estypes.AggregationsAggregationRange[]
): Promise<{ fractions: number[]; totalDocCount: number }> => {
  const resp = await esClient.search(
    getTransactionDurationRangesRequest(params, ranges)
  );
  if (resp.body.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationFractions failed, did not return aggregations.'
    );
  }

  const buckets = (resp.body.aggregations
    .latency_ranges as estypes.AggregationsMultiBucketAggregate<{
    doc_count: number;
  }>)?.buckets;

  const totalDocCount = buckets.reduce((acc, bucket) => {
    return acc + bucket.doc_count;
  }, 0);

  // Compute (doc count per bucket/total doc count)
  return {
    fractions: buckets.map((bucket) => bucket.doc_count / totalDocCount),
    totalDocCount,
  };
};
