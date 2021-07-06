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
import { TERMS_SIZE } from './constants';

interface FieldValuePair {
  field: string;
  value: string;
}
type FieldValuePairs = FieldValuePair[];

export type Field = string;

export const getTermsAggRequest = (
  params: SearchServiceParams,
  fieldName: string
): estypes.SearchRequest => ({
  index: params.index,
  body: {
    query: getQueryWithParams({ params }),
    size: 0,
    aggs: {
      attribute_terms: {
        terms: {
          field: fieldName,
          size: TERMS_SIZE,
        },
      },
    },
  },
});

export const fetchTransactionDurationFieldValuePairs = async (
  esClient: ElasticsearchClient,
  params: SearchServiceParams,
  fieldCandidates: Field[],
  progress: AsyncSearchProviderProgress
): Promise<FieldValuePairs> => {
  const fieldValuePairs: FieldValuePairs = [];

  let fieldValuePairsProgress = 1;

  for (let i = 0; i < fieldCandidates.length; i++) {
    const fieldName = fieldCandidates[i];
    // mutate progress
    progress.loadedFieldValuePairs =
      fieldValuePairsProgress / fieldCandidates.length;

    try {
      const resp = await esClient.search(getTermsAggRequest(params, fieldName));

      if (resp.body.aggregations === undefined) {
        fieldValuePairsProgress++;
        continue;
      }
      const buckets = (resp.body.aggregations
        .attribute_terms as estypes.AggregationsMultiBucketAggregate<{
        key: string;
      }>)?.buckets;
      if (buckets.length >= 1) {
        fieldValuePairs.push(
          ...buckets.map((d) => ({
            field: fieldName,
            value: d.key,
          }))
        );
      }

      fieldValuePairsProgress++;
    } catch (e) {
      fieldValuePairsProgress++;
    }
  }
  return fieldValuePairs;
};
