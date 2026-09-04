/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import {
  ATTRIBUTE_GEN_AI_INPUT_MESSAGES,
  ATTRIBUTE_GEN_AI_OUTPUT_MESSAGES,
  ATTRIBUTE_GEN_AI_SYSTEM_INSTRUCTIONS,
  ATTRIBUTE_GEN_AI_TOOL_CALL_ARGUMENTS,
  ATTRIBUTE_GEN_AI_TOOL_CALL_RESULT,
  ATTRIBUTE_GEN_AI_TOOL_DEFINITIONS,
} from '@kbn/apm-types/es_fields';
import { getFieldFromSource } from './get_field_from_source';

// Fields stored under the OTel flattened `attributes` mapping (ignore_above: 1024)
// whose values routinely exceed the limit. Values over the limit are silently
// dropped from the index at ingest time — invisible to the fields API — but
// survive in _source, so we fetch them there and merge as a fallback.
// Only the OTel `attributes.*` shape is covered here; the other key shapes the
// UI can read (`gen_ai.*`, `labels.gen_ai_*`) have no _source fallback.
// Keep in sync with the client-side twin `GEN_AI_LONG_MESSAGE_FIELDS` in
// `@kbn/apm-ui-shared` — that browser package cannot be imported here.
export const LONG_FIELDS_SOURCE_FALLBACK = [
  ATTRIBUTE_GEN_AI_INPUT_MESSAGES,
  ATTRIBUTE_GEN_AI_OUTPUT_MESSAGES,
  ATTRIBUTE_GEN_AI_SYSTEM_INSTRUCTIONS,
  ATTRIBUTE_GEN_AI_TOOL_DEFINITIONS,
  ATTRIBUTE_GEN_AI_TOOL_CALL_ARGUMENTS,
  ATTRIBUTE_GEN_AI_TOOL_CALL_RESULT,
];

/**
 * Returns a copy of the hit's `fields` with the {@link LONG_FIELDS_SOURCE_FALLBACK}
 * values recovered from `_source` where the indexed value is missing or was
 * dropped by `ignore_above`.
 */
export function mergeLongFieldsFromSource(hit: {
  fields?: Record<string, unknown[] | undefined>;
  _source?: unknown;
  _ignored?: string[];
}): Record<string, unknown[] | undefined> {
  const fields: Record<string, unknown[] | undefined> = { ...hit.fields };

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
