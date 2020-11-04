/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { endpointEntryMatchAny } from './entry_match_any';
import { endpointEntryMatch } from './entry_match';
import { endpointEntryNested } from './entry_nested';

export const endpointEntriesArray = t.array(
  t.union([endpointEntryMatch, endpointEntryMatchAny, endpointEntryNested])
);
export type EndpointEntriesArray = t.TypeOf<typeof endpointEntriesArray>;

/**
 * Types the nonEmptyEndpointEntriesArray as:
 *   - An array of entries of length 1 or greater
 *
 */
export const nonEmptyEndpointEntriesArray = new t.Type<
  EndpointEntriesArray,
  EndpointEntriesArray,
  unknown
>(
  'NonEmptyEndpointEntriesArray',
  (u: unknown): u is EndpointEntriesArray => endpointEntriesArray.is(u) && u.length > 0,
  (input, context): Either<t.Errors, EndpointEntriesArray> => {
    if (Array.isArray(input) && input.length === 0) {
      return t.failure(input, context);
    } else {
      return endpointEntriesArray.validate(input, context);
    }
  },
  t.identity
);

export type NonEmptyEndpointEntriesArray = t.OutputOf<typeof nonEmptyEndpointEntriesArray>;
export type NonEmptyEndpointEntriesArrayDecoded = t.TypeOf<typeof nonEmptyEndpointEntriesArray>;
