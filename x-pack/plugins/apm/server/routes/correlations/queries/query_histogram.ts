/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from 'src/core/server';

import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import type {
  FieldValuePair,
  HistogramItem,
  ResponseHit,
  CorrelationsParams,
} from '../../../../common/correlations/types';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

export const getTransactionDurationHistogramRequest = (
  params: CorrelationsParams,
  interval: number,
  termFilters?: FieldValuePair[]
): estypes.SearchRequest => ({
  ...getRequestBase(params),
  body: {
    query: getQueryWithParams({ params, termFilters }),
    size: 0,
    aggs: {
      transaction_duration_histogram: {
        histogram: { field: TRANSACTION_DURATION, interval },
      },
    },
  },
});

interface Aggs extends estypes.AggregationsMultiBucketAggregateBase {
  buckets: HistogramItem[];
}

export const fetchTransactionDurationHistogram = async (
  esClient: ElasticsearchClient,
  params: CorrelationsParams,
  interval: number,
  termFilters?: FieldValuePair[]
): Promise<HistogramItem[]> => {
  const resp = await esClient.search<
    ResponseHit,
    { transaction_duration_histogram: Aggs }
  >(getTransactionDurationHistogramRequest(params, interval, termFilters));

  if (resp.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationHistogram failed, did not return aggregations.'
    );
  }

  return resp.aggregations.transaction_duration_histogram.buckets ?? [];
};
