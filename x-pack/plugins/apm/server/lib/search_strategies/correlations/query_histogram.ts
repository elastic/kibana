/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';

import type { SearchServiceParams } from './async_search_service';
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

export const getTransactionDurationHistogramRequest = (
  params: SearchServiceParams,
  interval: number,
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
        transaction_duration_histogram: {
          histogram: { field: TRANSACTION_DURATION, interval },
        },
      },
    },
  };
};

export const fetchTransactionDurationHistogram = async (
  esClient: ElasticsearchClient,
  params: SearchServiceParams,
  interval: number,
  fieldName?: string,
  fieldValue?: string
): Promise<HistogramItem[]> => {
  const resp = await esClient.search<ResponseHit>(
    getTransactionDurationHistogramRequest(
      params,
      interval,
      fieldName,
      fieldValue
    )
  );

  if (resp.body.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationHistogram failed, did not return aggregations.'
    );
  }

  return (
    (resp.body.aggregations
      .transaction_duration_histogram as estypes.MultiBucketAggregate<HistogramItem>)
      .buckets ?? []
  );
};
