/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core/server';

import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import type {
  FieldValuePair,
  ResponseHit,
  CorrelationsParams,
} from '../../../../common/correlations/types';

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
  params: CorrelationsParams,
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

interface LatencyRange extends estypes.AggregationsMultiBucketAggregateBase {
  buckets: unknown[];
}
interface Correlation extends estypes.AggregationsRateAggregate {
  value: number;
}
interface Aggs {
  latency_ranges: LatencyRange;
  transaction_duration_correlation: Correlation;
  ks_test: {
    less: number | null;
  };
}

export const fetchTransactionDurationCorrelation = async (
  esClient: ElasticsearchClient,
  params: CorrelationsParams,
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
  const resp = await esClient.search<ResponseHit, Aggs>(
    getTransactionDurationCorrelationRequest(
      params,
      expectations,
      ranges,
      fractions,
      totalDocCount,
      termFilters
    )
  );

  if (resp.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationCorrelation failed, did not return aggregations.'
    );
  }

  const result = {
    ranges: resp.aggregations.latency_ranges.buckets,
    correlation: resp.aggregations.transaction_duration_correlation.value,
    ksTest: resp.aggregations.ks_test.less,
  };
  return result;
};
