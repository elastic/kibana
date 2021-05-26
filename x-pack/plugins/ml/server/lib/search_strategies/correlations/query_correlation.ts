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

export const getTransactionDurationCorrelationRequest = (
  params: SearchServiceParams,
  percentiles: Record<string, number>,
  totalHits: number,
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

  const percentileValues = Object.values(percentiles);

  const ranges = percentileValues.reduce(
    (p, to) => {
      const from = p[p.length - 1].to;
      p.push({ from, to });
      return p;
    },
    [{ to: 0 }] as Array<{ from?: number; to?: number }>
  );
  ranges.push({ from: ranges[ranges.length - 1].to });

  const expectations = percentileValues.map((d, index) => {
    const previous = percentileValues[index - 1] || 0;
    return (previous + d) / 2;
  });
  expectations.unshift(0);
  expectations.push(percentileValues[percentileValues.length - 1]);

  // console.log('totalHits', totalHits);
  // console.log('percentileValues', percentileValues);
  // console.log('ranges', ranges);
  // console.log('expectations', expectations);

  return {
    index: params.index,
    body: {
      query,
      size: 0,
      aggs: {
        latency_ranges: {
          range: {
            field: TRANSACTION_DURATION_US,
            ranges,
          },
        },
        transaction_duration_correlation: {
          bucket_correlation: {
            buckets_path: 'latency_ranges>_count',
            function: {
              count_correlation: {
                indicator: {
                  expectations,
                  doc_count: totalHits,
                },
              },
            },
          },
        },
      },
    },
  };
};

export const fetchTransactionDurationCorrelation = async (
  esClient: ElasticsearchClient,
  params: SearchServiceParams,
  percentiles: Record<string, number>,
  totalHits: number,
  fieldName?: string,
  fieldValue?: string
): Promise<any> => {
  const resp = await esClient.search<ResponseHit>(
    getTransactionDurationCorrelationRequest(params, percentiles, totalHits, fieldName, fieldValue)
  );

  if (resp.body.aggregations === undefined) {
    throw new Error('fetchTransactionDurationCorrelation failed, did not return aggregations.');
  }

  return {
    ranges: resp.body.aggregations.latency_ranges.buckets,
    correlation: resp.body.aggregations.transaction_duration_correlation.value,
  };
};
