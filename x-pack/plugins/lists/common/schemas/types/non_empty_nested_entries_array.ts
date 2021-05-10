/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { entriesMatchAny } from './entry_match_any';
import { entriesMatch } from './entry_match';
import { entriesExists } from './entry_exists';

export const nestedEntryItem = t.union([entriesMatch, entriesMatchAny, entriesExists]);
export const nestedEntriesArray = t.array(nestedEntryItem);
export type NestedEntriesArray = t.TypeOf<typeof nestedEntriesArray>;

/**
 * Types the nonEmptyNestedEntriesArray as:
 *   - An array of entries of length 1 or greater
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
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

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type NonEmptyNestedEntriesArray = t.OutputOf<typeof nonEmptyNestedEntriesArray>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type NonEmptyNestedEntriesArrayDecoded = t.TypeOf<typeof nonEmptyNestedEntriesArray>;
