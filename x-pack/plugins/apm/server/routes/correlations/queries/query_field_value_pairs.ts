/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'src/core/server';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type {
  FieldValuePair,
  CorrelationsParams,
} from '../../../../common/correlations/types';
import { TERMS_SIZE } from '../../../../common/correlations/constants';

import { splitAllSettledPromises } from '../utils';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

export const getTermsAggRequest = (
  params: CorrelationsParams,
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

interface Aggs extends estypes.AggregationsMultiBucketAggregateBase {
  buckets: Array<{
    key: string;
    key_as_string?: string;
  }>;
}

const fetchTransactionDurationFieldTerms = async (
  esClient: ElasticsearchClient,
  params: CorrelationsParams,
  fieldName: string
): Promise<FieldValuePair[]> => {
  const resp = await esClient.search<unknown, { attribute_terms: Aggs }>(
    getTermsAggRequest(params, fieldName)
  );

  if (resp.aggregations === undefined) {
    throw new Error(
      'fetchTransactionDurationFieldTerms failed, did not return aggregations.'
    );
  }

  const buckets = resp.aggregations.attribute_terms?.buckets;
  if (buckets?.length >= 1) {
    return buckets.map((d) => ({
      fieldName,
      // The terms aggregation returns boolean fields as { key: 0, key_as_string: "false" },
      // so we need to pick `key_as_string` if it's present, otherwise searches on boolean fields would fail later on.
      fieldValue: d.key_as_string ?? d.key,
    }));
  }

  return [];
};

export const fetchTransactionDurationFieldValuePairs = async (
  esClient: ElasticsearchClient,
  params: CorrelationsParams,
  fieldCandidates: string[]
): Promise<{ fieldValuePairs: FieldValuePair[]; errors: any[] }> => {
  const { fulfilled: responses, rejected: errors } = splitAllSettledPromises(
    await Promise.allSettled(
      fieldCandidates.map((fieldCandidate) =>
        fetchTransactionDurationFieldTerms(esClient, params, fieldCandidate)
      )
    )
  );

  return { fieldValuePairs: responses.flat(), errors };
};
