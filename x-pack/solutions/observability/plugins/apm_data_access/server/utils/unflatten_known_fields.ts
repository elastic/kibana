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
  KNOWN_SINGLE_VALUED_FIELDS,
  type KnownField,
  type MapToSingleOrMultiValue,
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
  const missingRequiredFields =
    requiredFields?.filter((key) => {
      const value = hitFields?.[key];
      return value === null || value === undefined || (Array.isArray(value) && value.length === 0);
    }) ?? [];

  if (missingRequiredFields.length > 0) {
    throw new Error(`Missing required fields ${missingRequiredFields.join(', ')} in event`);
  }

  const copy: Record<string, any> = mapToSingleOrMultiValue({
    ...hitFields,
  });

  const [knownFields, unknownFields] = Object.entries(copy).reduce(
    (prev, [key, value]) => {
      if (ALL_FIELDS.has(key as KnownField)) {
        prev[0][key as KnownField] = value;
      } else {
        prev[1][key] = value;
      }
      return prev;
    },
    [{} as Record<KnownField, any>, {} as Record<string, any>]
  );

  const unflattened = mergePlainObjects(
    unflattenObject(unknownFields),
    unflattenObject(knownFields)
  );

  return unflattened;
}

export function mapToSingleOrMultiValue<T extends Record<string, any>>(
  fields: T
): MapToSingleOrMultiValue<T> {
  KNOWN_SINGLE_VALUED_FIELDS.forEach((field) => {
    const value = fields[field];
    if (value !== null && value !== undefined) {
      fields[field as keyof T] = Array.isArray(value) ? value[0] : value;
    }
  });

  return fields;
}
