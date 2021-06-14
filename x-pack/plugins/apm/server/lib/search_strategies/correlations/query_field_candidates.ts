/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import type { SearchServiceParams } from '../../../../common/search_strategies/correlations/types';

import { getQueryWithParams } from './get_query_with_params';

const fieldCandidatesFilter = ['parent.id', 'trace.id', 'transaction.id'];

const POPULATED_DOC_COUNT_SAMPLE_SIZE = 500;

export const getRandomDocsRequest = (
  params: SearchServiceParams
): estypes.SearchRequest => ({
  index: params.index,
  body: {
    fields: ['*'],
    _source: false,
    query: {
      function_score: {
        query: getQueryWithParams(params),
        // @ts-ignore
        random_score: {},
      },
    },
    // Required value for later correlation queries
    track_total_hits: true,
    size: POPULATED_DOC_COUNT_SAMPLE_SIZE,
  },
});

export const fetchTransactionDurationFieldCandidates = async (
  esClient: ElasticsearchClient,
  params: SearchServiceParams
): Promise<{ fieldCandidates: string[]; totalHits: number }> => {
  const { index } = params;
  // Get all fields with keyword mapping
  const respMapping = await esClient.fieldCaps({ index, fields: '*' });
  const keywordFields = Object.entries(respMapping.body.fields)
    .filter(([key, value]) => {
      return Object.keys(value)[0] === 'keyword';
    })
    .map(([key]) => key);

  const resp = await esClient.search(getRandomDocsRequest(params));
  const docs = resp.body.hits.hits.map((d) => d.fields ?? {});

  // Get all field names for each returned doc and flatten it
  // to a list of unique field names used across all docs
  // and filter by fields of type keyword and some APM specific unique fields.
  const fieldCandidates = [...new Set(docs.map(Object.keys).flat(1))]
    .filter(
      (d) => keywordFields.includes(d) && !fieldCandidatesFilter.includes(d)
    )
    .sort();

  return {
    fieldCandidates,
    totalHits: (resp.body.hits.total as estypes.SearchTotalHits).value,
  };
};
