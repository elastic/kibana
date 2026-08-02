/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  ATTRIBUTE_GEN_AI_INPUT_MESSAGES,
  ATTRIBUTE_GEN_AI_OUTPUT_MESSAGES,
} from '@kbn/apm-types/es_fields';
import { castArray } from 'lodash';
import { ERROR_ID, SPAN_ID, ID, TRANSACTION_ID } from '../../../common/es_fields/apm';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getFieldFromSource } from './get_field_from_source';

// Fields stored under the OTel flattened `attributes` mapping (ignore_above: 1024)
// whose values routinely exceed the limit. Values over the limit are silently
// dropped from the index at ingest time — invisible to the fields API — but
// survive in _source, so we fetch them there and merge as a fallback.
const LONG_FIELDS_SOURCE_FALLBACK = [
  ATTRIBUTE_GEN_AI_INPUT_MESSAGES,
  ATTRIBUTE_GEN_AI_OUTPUT_MESSAGES,
];

export async function getEventMetadata({
  apmEventClient,
  processorEvent,
  id,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  processorEvent: ProcessorEvent;
  id: string;
  start: number;
  end: number;
}) {
  const fieldNames = getFieldNames(processorEvent);
  const response = await apmEventClient.search('get_event_metadata', {
    apm: {
      events: [processorEvent],
    },
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          {
            bool: {
              should: fieldNames.flatMap((fieldName) => termQuery(fieldName, id)),
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    size: 1,
    _source: LONG_FIELDS_SOURCE_FALLBACK,
    fields: [{ field: '*', include_unmapped: true }],
    terminate_after: 1,
  });

  const hit = response.hits.hits[0];
  const fields = { ...hit.fields };

  for (const fieldName of LONG_FIELDS_SOURCE_FALLBACK) {
    // Merge from _source when the indexed value is missing, or when ES flagged
    // the field as ignored — with array values, elements under the ignore_above
    // limit are indexed while longer ones are dropped, so `fields` can hold a
    // partial array while _source has the complete value.
    if (fields[fieldName] == null || hit._ignored?.includes(fieldName)) {
      const sourceValue = getFieldFromSource(hit._source, fieldName);
      if (sourceValue != null) {
        fields[fieldName] = castArray(sourceValue);
      }
    }
  }

  return fields;
}

function getFieldNames(processorEvent: ProcessorEvent) {
  switch (processorEvent) {
    case ProcessorEvent.error:
      return [ERROR_ID, ID];

    case ProcessorEvent.transaction:
      return [TRANSACTION_ID];

    case ProcessorEvent.span:
      return [SPAN_ID];

    default:
      throw new Error('Unknown processor event');
  }
}
