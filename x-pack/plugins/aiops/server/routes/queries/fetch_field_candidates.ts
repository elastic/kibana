/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { ES_FIELD_TYPES } from '@kbn/field-types';

import type { ElasticsearchClient } from '@kbn/core/server';

import type { AiopsExplainLogRateSpikesSchema } from '../../../common/api/explain_log_rate_spikes';

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

export const getRandomDocsRequest = (
  params: AiopsExplainLogRateSpikesSchema
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
  },
});

export const fetchFieldCandidates = async (
  esClient: ElasticsearchClient,
  params: AiopsExplainLogRateSpikesSchema,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  const { index } = params;
  // Get all supported fields
  const respMapping = await esClient.fieldCaps(
    {
      index,
      fields: '*',
    },
    { signal: abortSignal, maxRetries: 0 }
  );

  const finalFieldCandidates: Set<string> = new Set([]);
  const acceptableFields: Set<string> = new Set();

  Object.entries(respMapping.fields).forEach(([key, value]) => {
    const fieldTypes = Object.keys(value) as ES_FIELD_TYPES[];
    const isSupportedType = fieldTypes.some((type) => SUPPORTED_ES_FIELD_TYPES.includes(type));

    // Check if fieldName is something we can aggregate on
    if (isSupportedType) {
      acceptableFields.add(key);
    }
  });

  const resp = await esClient.search(getRandomDocsRequest(params), {
    signal: abortSignal,
    maxRetries: 0,
  });
  const sampledDocs = resp.hits.hits.map((d) => d.fields ?? {});

  // Get all field names for each returned doc and flatten it
  // to a list of unique field names used across all docs.
  // and filter by list of acceptable fields and some APM specific unique fields.
  [...new Set(sampledDocs.map(Object.keys).flat(1))].forEach((field) => {
    if (acceptableFields.has(field)) {
      finalFieldCandidates.add(field);
    }
  });

  return [...finalFieldCandidates];
};
