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
  HistogramItem,
  ResponseHit,
  SearchStrategyParams,
} from '../../../../common/search_strategies/types';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

export const getTransactionDurationHistogramRequest = (
  params: SearchStrategyParams,
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

export const fetchTransactionDurationHistogram = async (
  esClient: ElasticsearchClient,
  params: SearchStrategyParams,
  interval: number,
  termFilters?: FieldValuePair[]
): Promise<HistogramItem[]> => {
  const resp = await esClient.search<ResponseHit>(
    getTransactionDurationHistogramRequest(params, interval, termFilters)
  );

  if (resp.body.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationHistogram failed, did not return aggregations.'
    );
  }

  return (
    (
      resp.body.aggregations
        .transaction_duration_histogram as estypes.AggregationsMultiBucketAggregate<HistogramItem>
    ).buckets ?? []
  );
};
