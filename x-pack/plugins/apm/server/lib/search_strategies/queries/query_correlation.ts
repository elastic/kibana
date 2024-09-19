/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import type {
  FieldValuePair,
  ResponseHit,
  SearchStrategyParams,
} from '../../../../common/search_strategies/types';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

export interface BucketCorrelation {
  buckets_path: string;
  function: {
    count_correlation: {
      indicator: {
        fractions: number[];
        expectations: number[];
        doc_count: number;
      };
    };
  };
}

export const getTransactionDurationCorrelationRequest = (
  params: SearchStrategyParams,
  expectations: number[],
  ranges: estypes.AggregationsAggregationRange[],
  fractions: number[],
  totalDocCount: number,
  termFilters?: FieldValuePair[]
): estypes.SearchRequest => {
  const query = getQueryWithParams({ params, termFilters });

  const bucketCorrelation: BucketCorrelation = {
    buckets_path: 'latency_ranges>_count',
    function: {
      count_correlation: {
        indicator: {
          fractions,
          expectations,
          doc_count: totalDocCount,
        },
      },
    },
  };

  const body = {
    query,
    size: 0,
    aggs: {
      latency_ranges: {
        range: {
          field: TRANSACTION_DURATION,
          ranges,
        },
      },
      // Pearson correlation value
      transaction_duration_correlation: {
        bucket_correlation: bucketCorrelation,
      } as estypes.AggregationsAggregationContainer,
      // KS test p value = ks_test.less
      ks_test: {
        bucket_count_ks_test: {
          fractions,
          buckets_path: 'latency_ranges>_count',
          alternative: ['less', 'greater', 'two_sided'],
        },
      } as estypes.AggregationsAggregationContainer,
    },
  };
  return {
    ...getRequestBase(params),
    body,
  };
};

export const fetchTransactionDurationCorrelation = async (
  esClient: ElasticsearchClient,
  params: SearchStrategyParams,
  expectations: number[],
  ranges: estypes.AggregationsAggregationRange[],
  fractions: number[],
  totalDocCount: number,
  termFilters?: FieldValuePair[]
): Promise<{
  ranges: unknown[];
  correlation: number | null;
  ksTest: number | null;
}> => {
  const resp = await esClient.search<ResponseHit>(
    getTransactionDurationCorrelationRequest(
      params,
      expectations,
      ranges,
      fractions,
      totalDocCount,
      termFilters
    )
  );

  if (resp.body.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationCorrelation failed, did not return aggregations.'
    );
  }

  const result = {
    ranges: (
      resp.body.aggregations
        .latency_ranges as estypes.AggregationsMultiBucketAggregate
    ).buckets,
    correlation: (
      resp.body.aggregations
        .transaction_duration_correlation as estypes.AggregationsValueAggregate
    ).value,
    // @ts-ignore
    ksTest: resp.body.aggregations.ks_test.less,
  };
  return result;
};
