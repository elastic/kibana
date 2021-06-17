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
  const query = getQueryWithParams(params);

  if (typeof fieldName === 'string' && typeof fieldValue === 'string') {
    query.bool.filter.push({
      term: {
        [fieldName]: {
          value: fieldValue,
        },
      },
    });
  }

  return {
    index: params.index,
    body: {
      query,
      size: 0,
      aggs: {
        transaction_duration_percentiles: {
          percentiles: {
            hdr: {
              number_of_significant_value_digits: 3,
            },
            field: TRANSACTION_DURATION,
            ...(Array.isArray(percents) ? { percents } : {}),
          },
        },
      },
    },
  };
};

export const fetchTransactionDurationPecentiles = async (
  esClient: ElasticsearchClient,
  params: SearchServiceParams,
  percents?: number[],
  fieldName?: string,
  fieldValue?: string
): Promise<Record<string, number>> => {
  const resp = await esClient.search<ResponseHit>(
    getTransactionDurationPercentilesRequest(
      params,
      percents,
      fieldName,
      fieldValue
    )
  );

  if (resp.body.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationPecentiles failed, did not return aggregations.'
    );
  }
  return (
    (resp.body.aggregations
      .transaction_duration_percentiles as estypes.AggregationsTDigestPercentilesAggregate)
      .values ?? {}
  );
};
