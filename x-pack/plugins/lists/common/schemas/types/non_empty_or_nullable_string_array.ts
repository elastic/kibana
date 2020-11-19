/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the nonEmptyOrNullableStringArray as:
 *   - An array of non empty strings of length 1 or greater
 *   - This differs from NonEmptyStringArray in that both input and output are type array
 *
 */
export const nonEmptyOrNullableStringArray = new t.Type<string[], string[], unknown>(
  'NonEmptyOrNullableStringArray',
  t.array(t.string).is,
  (input, context): Either<t.Errors, string[]> => {
    const emptyValueFound = Array.isArray(input) && input.some((value) => value === '');
    const nonStringValueFound =
      Array.isArray(input) && input.some((value) => typeof value !== 'string');

    if (Array.isArray(input) && (emptyValueFound || nonStringValueFound || input.length === 0)) {
      return t.failure(input, context);
    } else {
      return t.array(t.string).validate(input, context);
    }
  },
  t.identity
);

export type NonEmptyOrNullableStringArray = t.OutputOf<typeof nonEmptyOrNullableStringArray>;
export type NonEmptyOrNullableStringArrayDecoded = t.TypeOf<typeof nonEmptyOrNullableStringArray>;
