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

export const getTransactionDurationRangesRequest = (
  params: SearchServiceFetchParams,
  rangesSteps: number[],
  fieldName?: string,
  fieldValue?: string
): estypes.SearchRequest => {
  const query = getQueryWithParams({ params, fieldName, fieldValue });

  const ranges = rangesSteps.reduce(
    (p, to) => {
      const from = p[p.length - 1].to;
      p.push({ from, to });
      return p;
    },
    [{ to: 0 }] as Array<{ from?: number; to?: number }>
  );
  if (ranges.length > 0) {
    ranges.push({ from: ranges[ranges.length - 1].to });
  }

  return {
    ...getRequestBase(params),
    body: {
      query,
      size: 0,
      aggs: {
        logspace_ranges: {
          range: {
            field: TRANSACTION_DURATION,
            ranges,
          },
        },
      },
    },
  };
};

export const fetchTransactionDurationRanges = async (
  esClient: ElasticsearchClient,
  params: SearchServiceFetchParams,
  rangesSteps: number[],
  fieldName?: string,
  fieldValue?: string
): Promise<Array<{ key: number; doc_count: number }>> => {
  const resp = await esClient.search<ResponseHit>(
    getTransactionDurationRangesRequest(
      params,
      rangesSteps,
      fieldName,
      fieldValue
    )
  );

  if (resp.body.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationCorrelation failed, did not return aggregations.'
    );
  }

  return (resp.body.aggregations
    .logspace_ranges as estypes.AggregationsMultiBucketAggregate<{
    from: number;
    doc_count: number;
  }>).buckets
    .map((d) => ({
      key: d.from,
      doc_count: d.doc_count,
    }))
    .filter((d) => d.key !== undefined);
};
