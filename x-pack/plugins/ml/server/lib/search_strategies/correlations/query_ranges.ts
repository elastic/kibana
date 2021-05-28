/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import { TRANSACTION_DURATION_US } from './constants';
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

export const getTransactionDurationRangesRequest = (
  params: SearchServiceParams,
  rangesSteps: number[],
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
  const ranges = rangesSteps.reduce(
    (p, to) => {
      const from = p[p.length - 1].to;
      p.push({ from, to });
      return p;
    },
    [{ to: 0 }] as Array<{ from?: number; to?: number }>
  );
  ranges.push({ from: ranges[ranges.length - 1].to });

  return {
    index: params.index,
    body: {
      query,
      size: 0,
      aggs: {
        logspace_ranges: {
          range: {
            field: TRANSACTION_DURATION_US,
            ranges,
          },
        },
      },
    },
  };
};

export const fetchTransactionDurationRanges = async (
  esClient: ElasticsearchClient,
  params: SearchServiceParams,
  rangesSteps: number[],
  fieldName?: string,
  fieldValue?: string
): Promise<any> => {
  const resp = await esClient.search<ResponseHit>(
    getTransactionDurationRangesRequest(params, rangesSteps, fieldName, fieldValue)
  );

  if (resp.body.aggregations === undefined) {
    throw new Error('fetchTransactionDurationCorrelation failed, did not return aggregations.');
  }

  return resp.body.aggregations.logspace_ranges.buckets
    .map((d) => ({
      key: d.from,
      doc_count: d.doc_count,
    }))
    .filter((d) => d.key !== undefined);
};
