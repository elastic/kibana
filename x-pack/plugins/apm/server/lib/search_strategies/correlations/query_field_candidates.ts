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
import { Field } from './query_field_value_pairs';

const fieldCandidatesFilter = [
  'parent.id',
  'trace.id',
  'transaction.id',
  '@timestamp',
  'transaction.duration.us',
  'duration_sla_pct',
  'timestamp.us',
  'transaction.marks.agent.firstContentfulPaint',
  'transaction.marks.agent.domInteractive',
  'transaction.marks.agent.domComplete',
  'transaction.marks.agent.largestContentfulPaint',
  'transaction.marks.agent.timeToFirstByte',
  'transaction.marks.navigationTiming.responseEnd',
  'transaction.marks.navigationTiming.responseStart',
  'transaction.marks.navigationTiming.domInteractive',
  'transaction.marks.navigationTiming.domainLookupEnd',
  'transaction.marks.navigationTiming.domContentLoadedEventStart',
  'transaction.marks.navigationTiming.domComplete',
  'transaction.marks.navigationTiming.domainLookupStart',
  'transaction.marks.navigationTiming.connectEnd',
  'transaction.marks.navigationTiming.connectStart',
  'transaction.marks.navigationTiming.loadEventStart',
  'transaction.marks.navigationTiming.requestStart',
  'transaction.marks.navigationTiming.fetchStart',
  'transaction.marks.navigationTiming.domContentLoadedEventEnd',
  'transaction.marks.navigationTiming.loadEventEnd',
  'transaction.marks.navigationTiming.domLoading',
  'transaction.experience.tbt',
  'transaction.experience.cls',
  'transaction.experience.fid',
  'transaction.experience.longtask.max',
  'transaction.experience.longtask.sum',
  'amount_f',
];

const POPULATED_DOC_COUNT_SAMPLE_SIZE = 1000;

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
): Promise<{ fieldCandidates: Field[]; totalHits: number }> => {
  const { index } = params;
  // Get all fields with keyword mapping
  const respMapping = await esClient.fieldCaps({
    index,
    fields: '*',
  });

  const keywordFields = Object.entries(respMapping.body.fields)
    .filter(([, value]) => {
      return Object.keys(value).includes('keyword');
    })
    .map(([key, value]) => ({ key, types: Object.keys(value) }));

  const resp = await esClient.search(getRandomDocsRequest(params));
  const docs = resp.body.hits.hits.map((d) => d.fields ?? {});

  // Get all field names for each returned doc and flatten it
  // to a list of unique field names used across all docs
  // and filter by fields of type keyword and some APM specific unique fields.
  const fieldCandidates = [...new Set(docs.map(Object.keys).flat(1))];

  const filteredFieldCandidates = [];

  fieldCandidates.forEach((d) => {
    const foundIdx = keywordFields.findIndex((k) => k.key === d);
    if (foundIdx > -1 && !fieldCandidatesFilter.includes(d)) {
      filteredFieldCandidates.push(keywordFields[foundIdx]);
    }
  });

  return {
    fieldCandidates,
    totalHits: (resp.body.hits.total as estypes.SearchTotalHits).value,
  };
};
