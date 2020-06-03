/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

export type DefaultBooleanTrueC = t.Type<boolean, boolean, unknown>;

/**
 * Types the DefaultBooleanTrue as:
 *   - If null or undefined, then a default true will be set
 */
export const DefaultBooleanTrue: DefaultBooleanTrueC = new t.Type<boolean, boolean, unknown>(
  'DefaultBooleanTrue',
  t.boolean.is,
  (input): Either<t.Errors, boolean> => (input == null ? t.success(true) : t.boolean.decode(input)),
  t.identity
);
