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

const TERMS_SIZE = 100;

interface FieldValuePair {
  field: string;
  value: string;
}
type FieldValuePairs = FieldValuePair[];

export const getTermsAggRequest = (
  params: SearchServiceParams,
  field: string
): estypes.SearchRequest => ({
  index: params.index,
  body: {
    query: getQueryWithParams(params),
    size: 0,
    aggs: {
      attribute_terms: {
        terms: { field, size: TERMS_SIZE },
      },
    },
  },
});

export const fetchTransactionDurationFieldValuePairs = async (
  esClient: ElasticsearchClient,
  params: SearchServiceParams,
  fieldCandidates: string[],
  progress: AsyncSearchProviderProgress
): Promise<FieldValuePairs> => {
  const fieldValuePairs: FieldValuePairs = [];

  let fieldValuePairsProgress = 0;
  for (const fieldCandidate of fieldCandidates) {
    // mutate progress
    progress.loadedFieldValuePairs =
      fieldValuePairsProgress / fieldCandidates.length;

    const resp = await esClient.search(
      getTermsAggRequest(params, fieldCandidate)
    );

    if (resp.body.aggregations === undefined) {
      throw new Error(
        'fetchTransactionDurationFieldValuePairs failed, did not return aggregations.'
      );
    }

    const buckets = (resp.body.aggregations
      .attribute_terms as estypes.AggregationsMultiBucketAggregate<{
      key: string;
    }>).buckets;

    if (buckets.length > 1) {
      fieldValuePairs.push(
        ...buckets.map((d) => ({
          field: fieldCandidate,
          value: d.key,
        }))
      );
    }

    fieldValuePairsProgress++;
  }

  return fieldValuePairs;
};
