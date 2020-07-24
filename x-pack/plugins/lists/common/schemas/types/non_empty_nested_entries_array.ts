/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { entriesMatchAny } from './entry_match_any';
import { entriesMatch } from './entry_match';
import { entriesExists } from './entry_exists';

export const nestedEntriesArray = t.array(t.union([entriesMatch, entriesMatchAny, entriesExists]));
export type NestedEntriesArray = t.TypeOf<typeof nestedEntriesArray>;

/**
 * Types the nonEmptyNestedEntriesArray as:
 *   - An array of entries of length 1 or greater
 *
 */
export const nonEmptyNestedEntriesArray = new t.Type<
  NestedEntriesArray,
  NestedEntriesArray,
  unknown
>(
  'NonEmptyNestedEntriesArray',
  nestedEntriesArray.is,
  (input, context): Either<t.Errors, NestedEntriesArray> => {
    if (Array.isArray(input) && input.length === 0) {
      return t.failure(input, context);
    } else {
      return nestedEntriesArray.validate(input, context);
    }
  },
  t.identity
);

export type NonEmptyNestedEntriesArray = t.OutputOf<typeof nonEmptyNestedEntriesArray>;
export type NonEmptyNestedEntriesArrayDecoded = t.TypeOf<typeof nonEmptyNestedEntriesArray>;
