/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { either } from 'fp-ts/lib/Either';

export const NumberFromString = new rt.Type<number, string, unknown>(
  'NumberFromString',
  rt.number.is,
  (u, c) =>
    either.chain(rt.string.validate(u, c), (s) => {
      const n = +s;
      return isNaN(n) ? rt.failure(u, c, 'cannot parse to a number') : rt.success(n);
    }),
  String
);

export const SavedObjectFindOptionsRt = rt.partial({
  defaultSearchOperator: rt.union([rt.literal('AND'), rt.literal('OR')]),
  fields: rt.array(rt.string),
  filter: rt.string,
  page: NumberFromString,
  perPage: NumberFromString,
  search: rt.string,
  searchFields: rt.array(rt.string),
  sortField: rt.string,
  sortOrder: rt.union([rt.literal('desc'), rt.literal('asc')]),
});

export type SavedObjectFindOptions = rt.TypeOf<typeof SavedObjectFindOptionsRt>;
