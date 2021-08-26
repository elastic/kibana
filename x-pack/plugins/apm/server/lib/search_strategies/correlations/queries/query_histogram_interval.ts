/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import { TRANSACTION_DURATION } from '../../../../../common/elasticsearch_fieldnames';
import type { SearchServiceFetchParams } from '../../../../../common/search_strategies/correlations/types';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

const HISTOGRAM_INTERVALS = 1000;

export const getHistogramIntervalRequest = (
  params: SearchServiceFetchParams
): estypes.SearchRequest => ({
  ...getRequestBase(params),
  body: {
    query: getQueryWithParams({ params }),
    size: 0,
    aggs: {
      transaction_duration_min: { min: { field: TRANSACTION_DURATION } },
      transaction_duration_max: { max: { field: TRANSACTION_DURATION } },
    },
  },
});

export const fetchTransactionDurationHistogramInterval = async (
  esClient: ElasticsearchClient,
  params: SearchServiceFetchParams
): Promise<number> => {
  const resp = await esClient.search(getHistogramIntervalRequest(params));

  if (resp.body.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationHistogramInterval failed, did not return aggregations.'
    );
  }

  const transactionDurationDelta =
    (resp.body.aggregations
      .transaction_duration_max as estypes.AggregationsValueAggregate).value -
    (resp.body.aggregations
      .transaction_duration_min as estypes.AggregationsValueAggregate).value;

  return transactionDurationDelta / (HISTOGRAM_INTERVALS - 1);
};
