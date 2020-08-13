/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';

import { FieldConfig } from '../../../../../../shared_imports';

export const arrayOfStrings = rt.array(rt.string);

export function isArrayOfStrings(v: unknown): v is string[] {
  const res = arrayOfStrings.decode(v);
  return isRight(res);
}

/**
 * Shared deserializer functions
 */
export const to = {
  booleanOrUndef: (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined),
  arrayOfStrings: (v: unknown): string[] => (isArrayOfStrings(v) ? v : []),
};

export type FieldsConfig = Record<string, FieldConfig>;
