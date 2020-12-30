/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the DefaultStringArray as:
 *   - If undefined, then a default array will be set
 *   - If an array is sent in, then the array will be validated to ensure all elements are a string
 */
export const DefaultStringArray = new t.Type<string[], string[] | undefined, unknown>(
  'DefaultStringArray',
  t.array(t.string).is,
  (input, context): Either<t.Errors, string[]> =>
    input == null ? t.success([]) : t.array(t.string).validate(input, context),
  t.identity
);
