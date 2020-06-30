/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { EntriesArray, entriesArray } from './entries';

export type DefaultEntriesArrayC = t.Type<EntriesArray, EntriesArray, unknown>;

/**
 * Types the DefaultEntriesArray as:
 *   - If null or undefined, then a default array of type entry will be set
 */
export const DefaultEntryArray: DefaultEntriesArrayC = new t.Type<
  EntriesArray,
  EntriesArray,
  unknown
>(
  'DefaultEntryArray',
  entriesArray.is,
  (input): Either<t.Errors, EntriesArray> =>
    input == null ? t.success([]) : entriesArray.decode(input),
  t.identity
);
