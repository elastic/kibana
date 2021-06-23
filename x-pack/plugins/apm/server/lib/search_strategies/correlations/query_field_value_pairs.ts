/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'src/core/server';

import type { estypes } from '@elastic/elasticsearch';

import type {
  AsyncSearchProviderProgress,
  SearchServiceParams,
} from '../../../../common/search_strategies/correlations/types';

import { getQueryWithParams } from './get_query_with_params';
import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import { PERCENTILES_STEP, TERMS_SIZE } from './constants';

interface FieldValuePair {
  field: string;
  value: string;
}
type FieldValuePairs = FieldValuePair[];

export type Field = string;

export const getCandidateTerms = (
  params: SearchServiceParams,
  fieldName: string,
  ranges: any[]
): estypes.SearchRequest => ({
  index: params.index,
  body: {
    size: 0,
    query: getQueryWithParams(params),
    aggs: {
      latency_range: {
        range: {
          field: TRANSACTION_DURATION,
          ranges,
        },
        aggs: {
          field_terms: {
            terms: {
              field: fieldName,
              size: TERMS_SIZE,
            },
          },
        },
      },
    },
  },
});

export const fetchTransactionDurationFieldValuePairs = async (
  esClient: ElasticsearchClient,
  params: SearchServiceParams,
  fieldCandidates: Field[],
  progress: AsyncSearchProviderProgress,
  percentiles: Record<string, number>
): Promise<FieldValuePairs> => {
  const fieldValuePairs: FieldValuePairs = [];

  let fieldValuePairsProgress = 0;

  const indices = [50, 75, 85, 95, 99].map((v) => {
    return Math.floor((v - PERCENTILES_STEP) / PERCENTILES_STEP + 0.5);
  });

  const percentilesArr = Object.values(percentiles);
  const ranges = indices.map((index) => ({
    from:
      percentilesArr[Math.min(index, Object.keys(percentilesArr).length - 1)],
  }));

  for (let i = 0; i < fieldCandidates.length; i++) {
    const fieldName = fieldCandidates[i];
    // mutate progress
    progress.loadedFieldValuePairs =
      fieldValuePairsProgress / fieldCandidates.length;

    try {
      /**
       * Select the terms which are likely to have high  correlation.
       */
      const candidateTermsResp = await esClient.search(
        getCandidateTerms(params, fieldName, ranges)
      );
      if (candidateTermsResp.body.aggregations?.latency_range === undefined) {
        continue;
      }
      const candidates = new Set<string>();
      const latencyRangeBuckets = (candidateTermsResp.body.aggregations
        .latency_range as estypes.AggregationsMultiBucketAggregate<{
        field_terms: {
          buckets: Array<{ key: string }>;
        };
      }>).buckets;

      latencyRangeBuckets.forEach((latencyRangeBucket) => {
        latencyRangeBucket.field_terms.buckets.forEach((fieldTerm) => {
          candidates.add(fieldTerm.key);
        });
      });
      fieldValuePairs.push(
        ...Array.from(candidates).map((value) => ({
          field: fieldName,
          value,
        }))
      );
      fieldValuePairsProgress++;
    } catch (e) {
      fieldValuePairsProgress++;
    }
  }
  return fieldValuePairs;
};
