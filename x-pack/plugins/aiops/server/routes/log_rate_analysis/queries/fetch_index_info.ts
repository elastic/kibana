/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { AiopsLogRateAnalysisSchema } from '../../../../common/api/log_rate_analysis';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

// TODO Consolidate with duplicate `fetchPValues` in
// `x-pack/plugins/apm/server/routes/correlations/queries/fetch_duration_field_candidates.ts`

const POPULATED_DOC_COUNT_SAMPLE_SIZE = 1000;

const SUPPORTED_ES_FIELD_TYPES = [
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.IP,
  ES_FIELD_TYPES.BOOLEAN,
];

const SUPPORTED_ES_FIELD_TYPES_TEXT = [ES_FIELD_TYPES.TEXT, ES_FIELD_TYPES.MATCH_ONLY_TEXT];

export const getRandomDocsRequest = (
  params: AiopsLogRateAnalysisSchema
): estypes.SearchRequest => ({
  ...getRequestBase(params),
  body: {
    fields: ['*'],
    _source: false,
    query: {
      function_score: {
        query: getQueryWithParams({ params }),
        // @ts-ignore
        random_score: {},
      },
    },
    size: POPULATED_DOC_COUNT_SAMPLE_SIZE,
    // Used to determine sample probability for follow up queries
    track_total_hits: true,
  },
});

interface IndexInfo {
  fieldCandidates: string[];
  textFieldCandidates: string[];
  totalDocCount: number;
}

export const fetchIndexInfo = async (
  esClient: ElasticsearchClient,
  params: AiopsLogRateAnalysisSchema,
  textFieldCandidatesOverrides: string[] = [],
  abortSignal?: AbortSignal
): Promise<IndexInfo> => {
  const { index } = params;
  // Get all supported fields
  const respMapping = await esClient.fieldCaps(
    {
      index,
      fields: '*',
    },
    { signal: abortSignal, maxRetries: 0 }
  );

  const allFieldNames: string[] = [];

  const finalFieldCandidates: Set<string> = new Set([]);
  const finalTextFieldCandidates: Set<string> = new Set([]);
  const acceptableFields: Set<string> = new Set();
  const acceptableTextFields: Set<string> = new Set();

  Object.entries(respMapping.fields).forEach(([key, value]) => {
    const fieldTypes = Object.keys(value) as ES_FIELD_TYPES[];
    const isSupportedType = fieldTypes.some((type) => SUPPORTED_ES_FIELD_TYPES.includes(type));
    const isAggregatable = fieldTypes.some((type) => value[type].aggregatable);
    const isTextField = fieldTypes.some((type) => SUPPORTED_ES_FIELD_TYPES_TEXT.includes(type));

    // Check if fieldName is something we can aggregate on
    if (isSupportedType && isAggregatable) {
      acceptableFields.add(key);
    }

    if (isTextField) {
      acceptableTextFields.add(key);
    }

    allFieldNames.push(key);
  });

  // Only the deviation window will be used to identify field candidates and sample probability based on total doc count.
  const resp = await esClient.search(
    getRandomDocsRequest({ ...params, start: params.deviationMin, end: params.deviationMax }),
    {
      signal: abortSignal,
      maxRetries: 0,
    }
  );
  const sampledDocs = resp.hits.hits.map((d) => d.fields ?? {});

  const textFieldCandidatesOverridesWithKeywordPostfix = textFieldCandidatesOverrides.map(
    (d) => `${d}.keyword`
  );

  // Get all field names for each returned doc and flatten it
  // to a list of unique field names used across all docs
  // and filter by list of acceptable fields.
  [...new Set(sampledDocs.map(Object.keys).flat(1))].forEach((field) => {
    if (
      acceptableFields.has(field) &&
      !textFieldCandidatesOverridesWithKeywordPostfix.includes(field)
    ) {
      finalFieldCandidates.add(field);
    }
    if (
      acceptableTextFields.has(field) &&
      (!allFieldNames.includes(`${field}.keyword`) || textFieldCandidatesOverrides.includes(field))
    ) {
      finalTextFieldCandidates.add(field);
    }
  });

  const totalDocCount = (resp.hits.total as estypes.SearchTotalHits).value;

  return {
    fieldCandidates: [...finalFieldCandidates],
    textFieldCandidates: [...finalTextFieldCandidates],
    totalDocCount,
  };
};
