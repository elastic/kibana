/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the DefaultStringBooleanFalse as:
 *   - If a string this will convert the string to a boolean
 *   - If null or undefined, then a default false will be set
 */
export const DefaultStringBooleanFalse = new t.Type<boolean, boolean, unknown>(
  'DefaultStringBooleanFalse',
  t.boolean.is,
  (input, context): Either<t.Errors, boolean> => {
    if (input == null) {
      return t.success(false);
    } else if (typeof input === 'string' && input.toLowerCase() === 'true') {
      return t.success(true);
    } else if (typeof input === 'string' && input.toLowerCase() === 'false') {
      return t.success(false);
    } else {
      return t.boolean.validate(input, context);
    }
  },
  t.identity
);

export type DefaultStringBooleanFalseC = typeof DefaultStringBooleanFalse;
