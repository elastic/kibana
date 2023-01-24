/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { DefaultSortOrderAsc, DefaultSortOrderDesc } from './sorting';

describe('Common sorting schemas', () => {
  describe('DefaultSortOrderAsc', () => {
    describe('Validation succeeds', () => {
      it('when valid sort order is passed', () => {
        const payload = 'desc';
        const decoded = DefaultSortOrderAsc.decode(payload);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(payload);
      });
    });

    describe('Validation fails', () => {
      it('when invalid sort order is passed', () => {
        const payload = 'behind_you';
        const decoded = DefaultSortOrderAsc.decode(payload);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([
          'Invalid value "behind_you" supplied to "DefaultSortOrderAsc"',
        ]);
        expect(message.schema).toEqual({});
      });
    });

    describe('Validation sets the default sort order "asc"', () => {
      it('when sort order is not passed', () => {
        const payload = undefined;
        const decoded = DefaultSortOrderAsc.decode(payload);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual('asc');
      });
    });
  });

  describe('DefaultSortOrderDesc', () => {
    describe('Validation succeeds', () => {
      it('when valid sort order is passed', () => {
        const payload = 'asc';
        const decoded = DefaultSortOrderDesc.decode(payload);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(payload);
      });
    });

    describe('Validation fails', () => {
      it('when invalid sort order is passed', () => {
        const payload = 'behind_you';
        const decoded = DefaultSortOrderDesc.decode(payload);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([
          'Invalid value "behind_you" supplied to "DefaultSortOrderDesc"',
        ]);
        expect(message.schema).toEqual({});
      });
    });

    describe('Validation sets the default sort order "desc"', () => {
      it('when sort order is not passed', () => {
        const payload = null;
        const decoded = DefaultSortOrderDesc.decode(payload);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual('desc');
      });
    });
  });
});
