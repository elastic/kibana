/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import uuid from 'uuid';

import { NonEmptyString } from './non_empty_string';

/**
 * Types the DefaultUuid as:
 *   - If null or undefined, then a default string uuid.v4() will be
 *     created otherwise it will be checked just against an empty string
 */
export const DefaultUuid = new t.Type<string, string, unknown>(
  'DefaultUuid',
  t.string.is,
  (input, context): Either<t.Errors, string> =>
    input == null ? t.success(uuid.v4()) : NonEmptyString.validate(input, context),
  t.identity
);

export type DefaultUuidC = typeof DefaultUuid;
