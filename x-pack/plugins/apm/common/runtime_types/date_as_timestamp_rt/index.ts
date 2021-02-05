/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

// Checks whether a string is a valid ISO timestamp,
// and returns its timestamp value

export const dateAsTimestampRt = new t.Type<any, string, unknown>(
  'DateAsString',
  t.string.is,
  (input, context) =>
    either.chain(t.string.validate(input, context), (str) => {
      const date = new Date(str);
      return isNaN(date.getTime())
        ? t.failure(input, context)
        : t.success(date.valueOf());
    }),
  (a) => {
    const d = new Date(a);
    return d.toISOString();
  }
);
