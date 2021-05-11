/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the DefaultEmptyString as:
 *   - If null or undefined, then a default of an empty string "" will be used
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const DefaultEmptyString = new t.Type<string, string | undefined, unknown>(
  'DefaultEmptyString',
  t.string.is,
  (input, context): Either<t.Errors, string> =>
    input == null ? t.success('') : t.string.validate(input, context),
  t.identity
);
