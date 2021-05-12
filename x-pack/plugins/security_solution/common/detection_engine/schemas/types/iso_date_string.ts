/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the IsoDateString as:
 *   - A string that is an ISOString
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const IsoDateString = new t.Type<string, string, unknown>(
  'IsoDateString',
  t.string.is,
  (input, context): Either<t.Errors, string> => {
    if (typeof input === 'string') {
      try {
        const parsed = new Date(input);
        if (parsed.toISOString() === input) {
          return t.success(input);
        } else {
          return t.failure(input, context);
        }
      } catch (err) {
        return t.failure(input, context);
      }
    } else {
      return t.failure(input, context);
    }
  },
  t.identity
);

export type IsoDateStringC = typeof IsoDateString;
