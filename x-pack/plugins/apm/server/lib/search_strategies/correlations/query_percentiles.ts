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
import { SIGNIFICANT_VALUE_DIGITS } from './constants';

export interface HistogramItem {
  key: number;
  doc_count: number;
}

interface ResponseHitSource {
  [s: string]: unknown;
}
interface ResponseHit {
  _source: ResponseHitSource;
}

export const getTransactionDurationPercentilesRequest = (
  params: SearchServiceParams,
  percents?: number[],
  fieldName?: string,
  fieldValue?: string
): estypes.SearchRequest => {
  const query = getQueryWithParams({ params, fieldName, fieldValue });

  return {
    index: params.index,
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

export const fetchTransactionDurationPercentiles = async (
  esClient: ElasticsearchClient,
  params: SearchServiceParams,
  percents?: number[],
  fieldName?: string,
  fieldValue?: string
): Promise<{ totalDocs: number; percentiles: Record<string, number> }> => {
  const resp = await esClient.search<ResponseHit>(
    getTransactionDurationPercentilesRequest(
      params,
      percents,
      fieldName,
      fieldValue
    )
  );

  // return early with no results if the search didn't return any documents
  if ((resp.body.hits.total as estypes.SearchTotalHits).value === 0) {
    return { totalDocs: 0, percentiles: {} };
  }

  if (resp.body.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationPercentiles failed, did not return aggregations.'
    );
  }

  return {
    totalDocs: (resp.body.hits.total as estypes.SearchTotalHits).value,
    percentiles:
      (resp.body.aggregations
        .transaction_duration_percentiles as estypes.AggregationsTDigestPercentilesAggregate)
        .values ?? {},
  };
};
