/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

// Checks whether a string is a valid ISO timestamp,
// and returns an epoch timestamp

export const isoToEpochRt = new t.Type<number, string, unknown>(
  'isoToEpochRt',
  t.number.is,
  (input, context) =>
    either.chain(t.string.validate(input, context), (str) => {
      const epochDate = new Date(str).getTime();
      return isNaN(epochDate)
        ? t.failure(input, context)
        : t.success(epochDate);
    }),
  (a) => {
    const d = new Date(a);
    return d.toISOString();
  }
);
