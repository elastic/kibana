/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scaleLog } from 'd3-scale';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import type { SearchServiceParams } from '../../../../common/search_strategies/correlations/types';

import { getQueryWithParams } from './get_query_with_params';

export const getHistogramIntervalRequest = (
  params: SearchServiceParams
): estypes.SearchRequest => ({
  index: params.index,
  body: {
    query: getQueryWithParams(params),
    size: 0,
    aggs: {
      transaction_duration_min: { min: { field: TRANSACTION_DURATION } },
      transaction_duration_max: { max: { field: TRANSACTION_DURATION } },
    },
  },
});

export const fetchTransactionDurationHistogramRangesteps = async (
  esClient: ElasticsearchClient,
  params: SearchServiceParams
): Promise<number[]> => {
  const resp = await esClient.search(getHistogramIntervalRequest(params));

  if (resp.body.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationHistogramInterval failed, did not return aggregations.'
    );
  }

  const steps = 100;
  const min = 1; // (resp.body.aggregations.transaction_duration_min as estypes.ValueAggregate).value;
  const max =
    (resp.body.aggregations
      .transaction_duration_max as estypes.AggregationsValueAggregate).value *
    2;

  // A d3 based scale function as a helper to get equally distributed bins on a log scale.
  const logFn = scaleLog().domain([min, max]).range([1, steps]);
  return [...Array(steps).keys()]
    .map(logFn.invert)
    .map((d) => (isNaN(d) ? 0 : d));
};
