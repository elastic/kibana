/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { CorrelationsParams } from '../../../../common/correlations/types';
import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

export const getTransactionDurationRangesRequest = (
  params: CorrelationsParams,
  ranges: estypes.AggregationsAggregationRange[]
): estypes.SearchRequest => ({
  ...getRequestBase(params),
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

interface Aggs {
  latency_ranges: {
    buckets: Array<{
      doc_count: number;
    }>;
  };
}
/**
 * Compute the actual percentile bucket counts and actual fractions
 */
export const fetchTransactionDurationFractions = async (
  esClient: ElasticsearchClient,
  params: CorrelationsParams,
  ranges: estypes.AggregationsAggregationRange[]
): Promise<{ fractions: number[]; totalDocCount: number }> => {
  const resp = await esClient.search<unknown, Aggs>(
    getTransactionDurationRangesRequest(params, ranges)
  );

  if ((resp.hits.total as estypes.SearchTotalHits).value === 0) {
    return {
      fractions: [],
      totalDocCount: 0,
    };
  }

  if (resp.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationFractions failed, did not return aggregations.'
    );
  }

  const buckets = resp.aggregations.latency_ranges?.buckets;

  const totalDocCount = buckets.reduce((acc, bucket) => {
    return acc + bucket.doc_count;
  }, 0);

  // Compute (doc count per bucket/total doc count)
  return {
    fractions: buckets.map((bucket) => bucket.doc_count / totalDocCount),
    totalDocCount,
  };
};
