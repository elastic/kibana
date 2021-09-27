/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import type { SearchStrategyParams } from '../../../../common/search_strategies/types';

import {
  FIELD_PREFIX_TO_EXCLUDE_AS_CANDIDATE,
  FIELDS_TO_ADD_AS_CANDIDATE,
  FIELDS_TO_EXCLUDE_AS_CANDIDATE,
  POPULATED_DOC_COUNT_SAMPLE_SIZE,
} from '../constants';
import { hasPrefixToInclude } from '../utils';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

export const shouldBeExcluded = (fieldName: string) => {
  return (
    FIELDS_TO_EXCLUDE_AS_CANDIDATE.has(fieldName) ||
    FIELD_PREFIX_TO_EXCLUDE_AS_CANDIDATE.some((prefix) =>
      fieldName.startsWith(prefix)
    )
  );
};

export const getRandomDocsRequest = (
  params: SearchStrategyParams
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

export const fetchTransactionDurationFieldCandidates = async (
  esClient: ElasticsearchClient,
  params: SearchStrategyParams
): Promise<{ fieldCandidates: string[] }> => {
  const { index } = params;
  // Get all fields with keyword mapping
  const respMapping = await esClient.fieldCaps({
    index,
    fields: '*',
  });

  const finalFieldCandidates = new Set(FIELDS_TO_ADD_AS_CANDIDATE);
  const acceptableFields: Set<string> = new Set();

  Object.entries(respMapping.body.fields).forEach(([key, value]) => {
    const fieldTypes = Object.keys(value);
    const isSupportedType = fieldTypes.some(
      (type) => type === 'keyword' || type === 'ip'
    );
    // Definitely include if field name matches any of the wild card
    if (hasPrefixToInclude(key) && isSupportedType) {
      finalFieldCandidates.add(key);
    }

    // Check if fieldName is something we can aggregate on
    if (isSupportedType) {
      acceptableFields.add(key);
    }
  });

  const resp = await esClient.search(getRandomDocsRequest(params));
  const sampledDocs = resp.body.hits.hits.map((d) => d.fields ?? {});

  // Get all field names for each returned doc and flatten it
  // to a list of unique field names used across all docs
  // and filter by list of acceptable fields and some APM specific unique fields.
  [...new Set(sampledDocs.map(Object.keys).flat(1))].forEach((field) => {
    if (acceptableFields.has(field) && !shouldBeExcluded(field)) {
      finalFieldCandidates.add(field);
    }
  });

  return {
    fieldCandidates: [...finalFieldCandidates],
  };
};
