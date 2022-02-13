/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from 'src/core/server';

import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import { SIGNIFICANT_VALUE_DIGITS } from '../../../../common/correlations/constants';
import type {
  FieldValuePair,
  ResponseHit,
  CorrelationsParams,
} from '../../../../common/correlations/types';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

export const getTransactionDurationPercentilesRequest = (
  params: CorrelationsParams,
  percents?: number[],
  termFilters?: FieldValuePair[]
): estypes.SearchRequest => {
  const query = getQueryWithParams({ params, termFilters });

  return {
    ...getRequestBase(params),
    body: {
      track_total_hits: true,
      query,
      size: 0,
      aggs: {
        transaction_duration_percentiles: {
          percentiles: {
            hdr: {
              number_of_significant_value_digits: SIGNIFICANT_VALUE_DIGITS,
            },
            field: TRANSACTION_DURATION,
            ...(Array.isArray(percents) ? { percents } : {}),
          },
        },
      },
    },
  };
};

interface Aggs extends estypes.AggregationsTDigestPercentilesAggregate {
  values: Record<string, number>;
}

export const fetchTransactionDurationPercentiles = async (
  esClient: ElasticsearchClient,
  params: CorrelationsParams,
  percents?: number[],
  termFilters?: FieldValuePair[]
): Promise<{ totalDocs: number; percentiles: Record<string, number> }> => {
  const resp = await esClient.search<
    ResponseHit,
    { transaction_duration_percentiles: Aggs }
  >(getTransactionDurationPercentilesRequest(params, percents, termFilters));

  // return early with no results if the search didn't return any documents
  if ((resp.hits.total as estypes.SearchTotalHits).value === 0) {
    return { totalDocs: 0, percentiles: {} };
  }

  if (resp.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationPercentiles failed, did not return aggregations.'
    );
  }

  return {
    totalDocs: (resp.hits.total as estypes.SearchTotalHits).value,
    percentiles:
      resp.aggregations.transaction_duration_percentiles.values ?? {},
  };
};
