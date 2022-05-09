/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scaleLog } from 'd3-scale';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core/server';

import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import type { CorrelationsParams } from '../../../../common/correlations/types';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

export const getHistogramRangeSteps = (
  min: number,
  max: number,
  steps: number
) => {
  // A d3 based scale function as a helper to get equally distributed bins on a log scale.
  // We round the final values because the ES range agg we use won't accept numbers with decimals for `transaction.duration.us`.
  const logFn = scaleLog().domain([min, max]).range([1, steps]);
  return [...Array(steps).keys()]
    .map(logFn.invert)
    .map((d) => (isNaN(d) ? 0 : Math.round(d)));
};
interface Aggs extends estypes.AggregationsRateAggregate {
  value: number;
}

export const getHistogramIntervalRequest = (
  params: CorrelationsParams
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

export const fetchTransactionDurationHistogramRangeSteps = async (
  esClient: ElasticsearchClient,
  params: CorrelationsParams
): Promise<number[]> => {
  const steps = 100;

  const resp = await esClient.search<
    unknown,
    {
      transaction_duration_min: Aggs;
      transaction_duration_max: Aggs;
    }
  >(getHistogramIntervalRequest(params));

  if ((resp.hits.total as estypes.SearchTotalHits).value === 0) {
    return getHistogramRangeSteps(0, 1, 100);
  }

  if (resp.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationHistogramRangeSteps failed, did not return aggregations.'
    );
  }

  const min = resp.aggregations.transaction_duration_min.value;
  const max = resp.aggregations.transaction_duration_max.value * 2;

  return getHistogramRangeSteps(min, max, steps);
};
