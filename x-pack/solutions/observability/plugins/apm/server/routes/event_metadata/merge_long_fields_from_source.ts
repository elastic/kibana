/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import { GEN_AI_LONG_MESSAGE_FIELDS } from '@kbn/genai-common';
import { getFieldFromSource } from './get_field_from_source';

export const LONG_FIELDS_SOURCE_FALLBACK = GEN_AI_LONG_MESSAGE_FIELDS;

/**
 * Returns a copy of the hit's `fields` with the {@link GEN_AI_LONG_MESSAGE_FIELDS}
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
