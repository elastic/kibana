/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import type { CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
import {
  FIELD_PREFIX_TO_EXCLUDE_AS_CANDIDATE,
  FIELDS_TO_ADD_AS_CANDIDATE,
  FIELDS_TO_EXCLUDE_AS_CANDIDATE,
} from '../../../../common/correlations/constants';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

const SUPPORTED_ES_FIELD_TYPES = [
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.IP,
  ES_FIELD_TYPES.BOOLEAN,
];

export const shouldBeExcluded = (fieldName: string) => {
  return (
    FIELDS_TO_EXCLUDE_AS_CANDIDATE.has(fieldName) ||
    FIELD_PREFIX_TO_EXCLUDE_AS_CANDIDATE.some((prefix) => fieldName.startsWith(prefix))
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
  const respMapping = await apmEventClient.fieldCaps('get_field_caps', {
    apm: {
      events: [eventType],
    },
    fields: '*',
    filters: '-metadata',
    include_empty_fields: false,
    index_filter: rangeQuery(start, end)[0],
    types: SUPPORTED_ES_FIELD_TYPES,
  });

  const finalFieldCandidates = new Set(FIELDS_TO_ADD_AS_CANDIDATE);

  // There seems to be an issue with the `types` query parameter in the
  // field caps API. It will return fields of type `object` even if that's not
  // part of the given types. So here we need to filter out these fields manually.
  Object.entries(respMapping.fields).forEach(([key, value]) => {
    const fieldTypes = Object.keys(value) as ES_FIELD_TYPES[];
    const isSupportedType = fieldTypes.some((type) => SUPPORTED_ES_FIELD_TYPES.includes(type));

    if (isSupportedType) {
      finalFieldCandidates.add(key);
    }
  });

  return {
    fieldCandidates: [...finalFieldCandidates],
  };
}
