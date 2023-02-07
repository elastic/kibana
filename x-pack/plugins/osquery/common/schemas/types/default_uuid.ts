/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { Either } from 'fp-ts/lib/Either';
import { v4 as uuidv4 } from 'uuid';

import { NonEmptyString } from './non_empty_string';

/**
 * Types the DefaultUuid as:
 *   - If null or undefined, then a default string uuidv4() will be
 *     created otherwise it will be checked just against an empty string
 */
export const DefaultUuid = new t.Type<string, string | undefined, unknown>(
  'DefaultUuid',
  t.string.is,
  (input, context): Either<t.Errors, string> =>
    input == null ? t.success(uuidv4()) : NonEmptyString.validate(input, context),
  t.identity
);
