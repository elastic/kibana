/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

export const PaginationSchema = new rt.Type<
  { page?: number; perPage?: number },
  { page?: number; perPage?: number },
  unknown
>(
  'Test',
  rt.partial({ page: rt.number, perPage: rt.number }).is,
  (u, c) =>
    either.chain(rt.partial({ page: rt.number, perPage: rt.number }).validate(u, c), (params) => {
      if (params.page == null && params.perPage) {
        return rt.success(params);
      }

      const pageAsNumber = params.page ?? 0;
      const perPageAsNumber = params.perPage ?? 0;

      if (Math.max(pageAsNumber, pageAsNumber * perPageAsNumber) > 10) {
        return rt.failure(
          u,
          c,
          `The number of documents is too high. Paginating through more than ${10} documents is not possible.`
        );
      }

      return rt.success(params);
    }),
  rt.identity
);
