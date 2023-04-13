/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
import {
  FIELD_PREFIX_TO_EXCLUDE_AS_CANDIDATE,
  FIELDS_TO_ADD_AS_CANDIDATE,
  FIELDS_TO_EXCLUDE_AS_CANDIDATE,
  POPULATED_DOC_COUNT_SAMPLE_SIZE,
} from '../../../../common/correlations/constants';
import { hasPrefixToInclude } from '../../../../common/correlations/utils';
import { getCommonCorrelationsQuery } from './get_common_correlations_query';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

const SUPPORTED_ES_FIELD_TYPES = [
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.IP,
  ES_FIELD_TYPES.BOOLEAN,
];

export const shouldBeExcluded = (fieldName: string) => {
  return (
    FIELDS_TO_EXCLUDE_AS_CANDIDATE.has(fieldName) ||
    FIELD_PREFIX_TO_EXCLUDE_AS_CANDIDATE.some((prefix) =>
      fieldName.startsWith(prefix)
    )
  );
};

export interface DurationFieldCandidatesResponse {
  fieldCandidates: string[];
}

export async function fetchDurationFieldCandidates({
  apmEventClient,
  eventType,
  query,
  start,
  end,
  environment,
  kuery,
}: CommonCorrelationsQueryParams & {
  query: estypes.QueryDslQueryContainer;
  apmEventClient: APMEventClient;
  eventType: ProcessorEvent.transaction | ProcessorEvent.span;
}): Promise<DurationFieldCandidatesResponse> {
  // Get all supported fields
  const [respMapping, respRandomDoc] = await Promise.all([
    apmEventClient.fieldCaps('get_field_caps', {
      apm: {
        events: [eventType],
      },
      fields: '*',
    }),
    apmEventClient.search('get_random_doc_for_field_candidate', {
      apm: {
        events: [eventType],
      },
      body: {
        track_total_hits: false,
        fields: ['*'],
        _source: false,
        query: getCommonCorrelationsQuery({
          start,
          end,
          environment,
          kuery,
          query,
        }),
        size: POPULATED_DOC_COUNT_SAMPLE_SIZE,
      },
    }),
  ]);

  const finalFieldCandidates = new Set(FIELDS_TO_ADD_AS_CANDIDATE);
  const acceptableFields: Set<string> = new Set();

  Object.entries(respMapping.fields).forEach(([key, value]) => {
    const fieldTypes = Object.keys(value) as ES_FIELD_TYPES[];
    const isSupportedType = fieldTypes.some((type) =>
      SUPPORTED_ES_FIELD_TYPES.includes(type)
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

  const sampledDocs = respRandomDoc.hits.hits.map((d) => d.fields ?? {});

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
}
