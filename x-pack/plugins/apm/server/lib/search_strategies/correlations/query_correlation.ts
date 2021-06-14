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

interface BucketCorrelation {
  buckets_path: string;
  function: {
    count_correlation: {
      indicator: {
        expectations: number[];
        doc_count: number;
      };
    };
  };
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

  const step = 2;
  const tempPercentiles = [percentileValues[0]];
  const tempFractions = [step / 100];
  // Collapse duplicates
  for (let i = 1; i < percentileValues.length; i++) {
    if (percentileValues[i] !== percentileValues[i - 1]) {
      tempPercentiles.push(percentileValues[i]);
      tempFractions.push(2 / 100);
    } else {
      tempFractions[tempFractions.length - 1] =
        tempFractions[tempFractions.length - 1] + step / 100;
    }
  }
  tempFractions.push(2 / 100);

  const tempRanges = percentileValues.reduce((p, to) => {
    const from = p[p.length - 1]?.to;
    if (from) {
      p.push({ from, to });
    } else {
      p.push({ to });
    }
    return p;
  }, [] as Array<{ from?: number; to?: number }>);
  tempRanges.push({ from: tempRanges[tempRanges.length - 1].to });

  const tempExpectations = [tempPercentiles[0]];
  for (let i = 1; i < tempPercentiles.length; i++) {
    tempExpectations.push(
      (tempFractions[i - 1] * tempPercentiles[i - 1] +
        tempFractions[i] * tempPercentiles[i]) /
        (tempFractions[i - 1] + tempFractions[i])
    );
  }
  tempExpectations.push(tempPercentiles[tempPercentiles.length - 1]);

  const expectations = percentileValues.map((d, index) => {
    const previous = percentileValues[index - 1] || 0;
    return (previous + d) / 2;
  });
  expectations.unshift(0);
  expectations.push(percentileValues[percentileValues.length - 1]);

  const bucketCorrelation: BucketCorrelation = {
    buckets_path: 'latency_ranges>_count',
    function: {
      count_correlation: {
        indicator: {
          expectations: tempExpectations,
          doc_count: totalHits,
        },
      },
    },
  };

  const body = {
    query,
    size: 0,
    aggs: {
      latency_ranges: {
        range: {
          field: TRANSACTION_DURATION,
          ranges: tempRanges,
        },
      },
      // Pearson correlation value
      transaction_duration_correlation: {
        bucket_correlation: bucketCorrelation,
      } as estypes.AggregationsAggregationContainer,
      // KS test p value = ks_test.less
      ks_test: {
        bucket_count_ks_test: {
          buckets_path: 'latency_ranges>_count',
          alternative: ['less', 'greater', 'two_sided'],
        },
      } as estypes.AggregationsAggregationContainer,
    },
  };
  return {
    index: params.index,
    body,
  };
};

export const fetchTransactionDurationCorrelation = async (
  esClient: ElasticsearchClient,
  params: SearchServiceParams,
  percentiles: Record<string, number>,
  totalHits: number,
  fieldName?: string,
  fieldValue?: string
): Promise<{
  ranges: unknown[];
  correlation: number | null;
  ksTest: number | null;
}> => {
  const resp = await esClient.search<ResponseHit>(
    getTransactionDurationCorrelationRequest(
      params,
      percentiles,
      totalHits,
      fieldName,
      fieldValue
    )
  );

  if (resp.body.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationCorrelation failed, did not return aggregations.'
    );
  }

  const result = {
    ranges: (resp.body.aggregations
      .latency_ranges as estypes.AggregationsMultiBucketAggregate).buckets,
    correlation: (resp.body.aggregations
      .transaction_duration_correlation as estypes.AggregationsValueAggregate)
      .value,
    // @ts-ignore
    ksTest: resp.body.aggregations.ks_test.less,
  };
  return result;
};
