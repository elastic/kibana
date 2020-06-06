/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

export type DefaultBooleanFalseC = t.Type<boolean, boolean, unknown>;

/**
 * Types the DefaultBooleanFalse as:
 *   - If null or undefined, then a default false will be set
 */
export const DefaultBooleanFalse: DefaultBooleanFalseC = new t.Type<boolean, boolean, unknown>(
  'DefaultBooleanFalse',
  t.boolean.is,
  (input): Either<t.Errors, boolean> =>
    input == null ? t.success(false) : t.boolean.decode(input),
  t.identity
);
