/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { endpointEntryMatchAny } from './entry_match_any';
import { endpointEntryMatch } from './entry_match';

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const endpointNestedEntriesArray = t.array(
  t.union([endpointEntryMatch, endpointEntryMatchAny])
);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type EndpointNestedEntriesArray = t.TypeOf<typeof endpointNestedEntriesArray>;

/**
 * Types the nonEmptyNestedEntriesArray as:
 *   - An array of entries of length 1 or greater
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const nonEmptyEndpointNestedEntriesArray = new t.Type<
  EndpointNestedEntriesArray,
  EndpointNestedEntriesArray,
  unknown
>(
  'NonEmptyEndpointNestedEntriesArray',
  (u: unknown): u is EndpointNestedEntriesArray => endpointNestedEntriesArray.is(u) && u.length > 0,
  (input, context): Either<t.Errors, EndpointNestedEntriesArray> => {
    if (Array.isArray(input) && input.length === 0) {
      return t.failure(input, context);
    } else {
      return endpointNestedEntriesArray.validate(input, context);
    }
  },
  t.identity
);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type NonEmptyEndpointNestedEntriesArray = t.OutputOf<
  typeof nonEmptyEndpointNestedEntriesArray
>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type NonEmptyEndpointNestedEntriesArrayDecoded = t.TypeOf<
  typeof nonEmptyEndpointNestedEntriesArray
>;
