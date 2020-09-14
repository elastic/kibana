/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { EntriesArray, entriesArray } from './entries';
import { entriesList } from './entry_list';

/**
 * Types the nonEmptyEntriesArray as:
 *   - An array of entries of length 1 or greater
 *
 */
export const nonEmptyEntriesArray = new t.Type<EntriesArray, EntriesArray, unknown>(
  'NonEmptyEntriesArray',
  entriesArray.is,
  (input, context): Either<t.Errors, EntriesArray> => {
    if (Array.isArray(input) && input.length === 0) {
      return t.failure(input, context);
    } else {
      if (
        Array.isArray(input) &&
        input.some((entry) => entriesList.is(entry)) &&
        input.some((entry) => !entriesList.is(entry))
      ) {
        // fail when an exception item contains both a value list entry and a non-value list entry
        return t.failure(input, context, 'Cannot have entry of type list and other');
      }
      return entriesArray.validate(input, context);
    }
  },
  t.identity
);

export type NonEmptyEntriesArray = t.OutputOf<typeof nonEmptyEntriesArray>;
export type NonEmptyEntriesArrayDecoded = t.TypeOf<typeof nonEmptyEntriesArray>;
