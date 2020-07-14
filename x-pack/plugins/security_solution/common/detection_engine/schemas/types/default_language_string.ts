/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { language } from '../common/schemas';

/**
 * Types the DefaultLanguageString as:
 *   - If null or undefined, then a default of the string "kuery" will be used
 */
export const DefaultLanguageString = new t.Type<string, string, unknown>(
  'DefaultLanguageString',
  t.string.is,
  (input, context): Either<t.Errors, string> =>
    input == null ? t.success('kuery') : language.validate(input, context),
  t.identity
);

export type DefaultLanguageStringC = typeof DefaultLanguageString;
