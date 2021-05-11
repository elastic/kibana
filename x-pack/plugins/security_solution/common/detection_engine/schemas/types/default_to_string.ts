/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the DefaultToString as:
 *   - If null or undefined, then a default of the string "now" will be used
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const DefaultToString = new t.Type<string, string | undefined, unknown>(
  'DefaultToString',
  t.string.is,
  (input, context): Either<t.Errors, string> =>
    input == null ? t.success('now') : t.string.validate(input, context),
  t.identity
);
