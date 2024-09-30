/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DedotObject } from '@kbn/utility-types';
import { SERVICE_NAME, SPAN_SUBTYPE, SPAN_TYPE } from '@kbn/apm-types/es_fields';
import { ValuesType } from 'utility-types';

const KNOWN_SINGLE_VALUED_FIELDS = [SPAN_TYPE, SPAN_SUBTYPE, SERVICE_NAME];

type KnownSingleValuedField = ValuesType<typeof KNOWN_SINGLE_VALUED_FIELDS>;

type UnflattenedKnownFields<T extends Record<string, any>> = DedotObject<{
  [key in keyof T]: key extends KnownSingleValuedField
    ? T[key] extends undefined
      ? string | undefined
      : string
    : T[key];
}>;

export function unflattenKnownApmEventFields<T extends Record<string, any>>(
  fields: T
): UnflattenedKnownFields<T> {
  return fields as UnflattenedKnownFields<T>;
}
