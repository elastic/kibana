/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

// Checks whether a string is a valid ISO timestamp,
// but doesn't convert it into a Date object when decoding

export const dateAsStringRt = new t.Type<string, string, unknown>(
  'DateAsString',
  t.string.is,
  (input, context) =>
    either.chain(t.string.validate(input, context), (str) => {
      const date = new Date(str);
      return isNaN(date.getTime()) ? t.failure(input, context) : t.success(str);
    }),
  t.identity
);
