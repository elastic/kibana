/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValuesType } from 'utility-types';
import { set } from '@kbn/safer-lodash-set';
import { mergePlainObjects } from '@kbn/observability-utils-common/object/merge_plain_objects';
import {
  ALL_FIELDS,
  KNOWN_SINGLE_VALUED_FIELDS_SET,
  ensureRequiredApmFields,
  type KnownField,
  type UnflattenedKnownFields,
} from './utility_types';

export function unflattenKnownApmEventFields<T extends Record<string, any> | undefined = undefined>(
  fields: T
): T extends Record<string, any> ? UnflattenedKnownFields<T> : undefined;

export function unflattenKnownApmEventFields<
  T extends Record<string, any> | undefined,
  U extends Array<keyof Exclude<T, undefined>>
>(
  fields: T,
  required: U
): T extends Record<string, any>
  ? UnflattenedKnownFields<T> &
      (U extends any[]
        ? UnflattenedKnownFields<{
            [TKey in ValuesType<U>]: keyof T extends TKey ? T[TKey] : unknown[];
          }>
        : {})
  : undefined;

export function unflattenKnownApmEventFields(
  hitFields?: Record<string, any>,
  requiredFields?: string[]
) {
  if (!hitFields) {
    return undefined;
  }

  if (requiredFields) {
    ensureRequiredApmFields(hitFields, requiredFields);
  }

  // Merging still required in order to have correct overriding of known fields over unknown ones
  const unflattened = mergePlainObjects(...unflattenSingleOrMultiValueFields(hitFields));

  return unflattened;
}

function unflattenSingleOrMultiValueFields<T extends Record<string, any>>(
  fields: Readonly<T>
): [Record<string, any>, Record<KnownField, any>] {
  return Object.entries(fields).reduce(
    (mappedFields, [field, value]) => {
      const [unknownFields, knownFields] = mappedFields;

      if (value != null) {
        if (ALL_FIELDS.has(field as KnownField)) {
          const mappedValue =
            KNOWN_SINGLE_VALUED_FIELDS_SET.has(field as KnownField) && Array.isArray(value)
              ? value[0]
              : value;

          set(knownFields, field, mappedValue);
        } else {
          set(unknownFields, field, value);
        }
      }

      return mappedFields;
    },
    [{} as Record<string, any>, {} as Record<KnownField, any>]
  );
}
