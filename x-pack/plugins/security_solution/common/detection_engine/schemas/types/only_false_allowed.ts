/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the OnlyFalseAllowed as:
 *   - If null or undefined, then a default false will be set
 *   - If true is sent in then this will return an error
 *   - If false is sent in then this will allow it only false
 */
export const OnlyFalseAllowed = new t.Type<boolean, boolean, unknown>(
  'DefaultBooleanTrue',
  t.boolean.is,
  (input, context): Either<t.Errors, boolean> => {
    if (input == null) {
      return t.success(false);
    } else {
      if (typeof input === 'boolean' && input === false) {
        return t.success(false);
      } else {
        return t.failure(input, context);
      }
    }
  },
  t.identity
);

export type OnlyFalseAllowedC = typeof OnlyFalseAllowed;
