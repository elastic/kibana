/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'src/core/server';

import type { estypes } from '@elastic/elasticsearch';

import type {
  FieldValuePair,
  SearchStrategyParams,
} from '../../../../common/search_strategies/types';

import type { SearchServiceLog } from '../search_service_log';
import type { LatencyCorrelationsSearchServiceState } from '../latency_correlations/latency_correlations_search_service_state';
import { TERMS_SIZE } from '../constants';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

export const getTermsAggRequest = (
  params: SearchStrategyParams,
  fieldName: string
): estypes.SearchRequest => ({
  ...getRequestBase(params),
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

const fetchTransactionDurationFieldTerms = async (
  esClient: ElasticsearchClient,
  params: SearchStrategyParams,
  fieldName: string,
  addLogMessage: SearchServiceLog['addLogMessage']
): Promise<FieldValuePair[]> => {
  try {
    const resp = await esClient.search(getTermsAggRequest(params, fieldName));

    if (resp.body.aggregations === undefined) {
      addLogMessage(
        `Failed to fetch terms for field candidate ${fieldName} fieldValuePairs, no aggregations returned.`,
        JSON.stringify(resp)
      );
      return [];
    }
    const buckets = (
      resp.body.aggregations
        .attribute_terms as estypes.AggregationsMultiBucketAggregate<{
        key: string;
      }>
    )?.buckets;
    if (buckets?.length >= 1) {
      return buckets.map((d) => ({
        fieldName,
        fieldValue: d.key,
      }));
    }
  } catch (e) {
    addLogMessage(
      `Failed to fetch terms for field candidate ${fieldName} fieldValuePairs.`,
      JSON.stringify(e)
    );
  }

  return [];
};

async function fetchInSequence(
  fieldCandidates: string[],
  fn: (fieldCandidate: string) => Promise<FieldValuePair[]>
) {
  const results = [];

  for (const fieldCandidate of fieldCandidates) {
    results.push(...(await fn(fieldCandidate)));
  }

  return results;
}

export const fetchTransactionDurationFieldValuePairs = async (
  esClient: ElasticsearchClient,
  params: SearchStrategyParams,
  fieldCandidates: string[],
  state: LatencyCorrelationsSearchServiceState,
  addLogMessage: SearchServiceLog['addLogMessage']
): Promise<FieldValuePair[]> => {
  let fieldValuePairsProgress = 1;

  return await fetchInSequence(
    fieldCandidates,
    async function (fieldCandidate: string) {
      const fieldTerms = await fetchTransactionDurationFieldTerms(
        esClient,
        params,
        fieldCandidate,
        addLogMessage
      );

      state.setProgress({
        loadedFieldValuePairs: fieldValuePairsProgress / fieldCandidates.length,
      });
      fieldValuePairsProgress++;

      return fieldTerms;
    }
  );
};
