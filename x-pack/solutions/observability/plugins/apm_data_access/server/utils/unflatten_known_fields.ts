/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValuesType } from 'utility-types';
import { unflattenObject } from '@kbn/observability-utils-common/object/unflatten_object';
import { mergePlainObjects } from '@kbn/observability-utils-common/object/merge_plain_objects';
import {
  ALL_FIELDS,
  KNOWN_SINGLE_VALUED_FIELDS_SET,
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
    const missingRequiredFields = requiredFields.filter((key) => {
      const value = hitFields[key];
      return value == null || (Array.isArray(value) && value.length === 0);
    });

    if (missingRequiredFields.length > 0) {
      throw new Error(`Missing required fields ${missingRequiredFields.join(', ')} in event`);
    }
  }

  const [knownFields, unknownFields] = mapToSingleOrMultiValue(hitFields);

  const unflattened = mergePlainObjects(
    unflattenObject(unknownFields),
    unflattenObject(knownFields)
  );

  return unflattened;
}

function mapToSingleOrMultiValue<T extends Record<string, any>>(
  fields: Readonly<T>
): [Record<KnownField, any>, Record<string, any>] {
  return Object.entries(fields).reduce(
    (mappedFields, [field, value]) => {
      if (ALL_FIELDS.has(field as KnownField) && value != null) {
        mappedFields[0][field as KnownField] =
          KNOWN_SINGLE_VALUED_FIELDS_SET.has(field) && Array.isArray(value) ? value[0] : value;
      } else {
        mappedFields[1][field] = value;
      }
      return mappedFields;
    },
    [{} as Record<KnownField, any>, {} as Record<string, any>]
  );
}
