/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { getFunctionErrors } from '../../../i18n';
import { testTable } from './__fixtures__/test_tables';
import { ply } from './ply';

const errors = getFunctionErrors().ply;

const averagePrice = (datatable) => {
  const average = datatable.rows.reduce((sum, row) => sum + row.price, 0) / datatable.rows.length;

  return of({
    type: 'datatable',
    columns: [{ id: 'average_price', name: 'average_price', meta: { type: 'number' } }],
    rows: [{ average_price: average }],
  });
};

const doublePrice = (datatable) => {
  const newRows = datatable.rows.map((row) => of({ double_price: row.price * 2 }));

  return of({
    type: 'datatable',
    columns: [{ id: 'double_price', name: 'double_price', meta: { type: 'number' } }],
    rows: newRows,
  });
};

const rowCount = (datatable) =>
  of({
    type: 'datatable',
    columns: [{ id: 'row_count', name: 'row_count', meta: { type: 'number' } }],
    rows: [
      {
        row_count: datatable.rows.length,
      },
    ],
  });

describe('ply', () => {
  const fn = functionWrapper(ply);
  let testScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => expect(actual).toStrictEqual(expected));
  });

  it('maps a function over sub datatables grouped by specified columns and merges results into one datatable', () => {
    testScheduler.run(({ expectObservable }) => {
      expectObservable(
        fn(testTable, {
          by: ['name', 'in_stock'],
          expression: [averagePrice, rowCount],
        })
      ).toBe('(0|)', [
        expect.objectContaining({
          type: 'datatable',
          columns: [
            { id: 'name', name: 'name', meta: { type: 'string' } },
            { id: 'in_stock', name: 'in_stock', meta: { type: 'boolean' } },
            { id: 'average_price', name: 'average_price', meta: { type: 'number' } },
            { id: 'row_count', name: 'row_count', meta: { type: 'number' } },
          ],
          rows: expect.arrayContaining([
            expect.objectContaining({
              average_price: expect.anything(),
              row_count: expect.anything(),
            }),
          ]),
        }),
      ]);
    });
  });

  describe('missing args', () => {
    it('returns the original datatable if both args are missing', () => {
      testScheduler.run(({ expectObservable }) => {
        expectObservable(fn(testTable)).toBe('(0|)', [testTable]);
      });
    });

    describe('by', () => {
      it('passes the entire context into the expression when no columns are provided', () => {
        testScheduler.run(({ expectObservable }) => {
          expectObservable(fn(testTable, { expression: [rowCount] })).toBe('(0|)', [
            {
              type: 'datatable',
              rows: [{ row_count: testTable.rows.length }],
              columns: [{ id: 'row_count', name: 'row_count', meta: { type: 'number' } }],
            },
          ]);
        });
      });

      it('throws when by is an invalid column', () => {
        expect(() => fn(testTable, { by: [''], expression: [averagePrice] })).toThrow(
          new RegExp(errors.columnNotFound('').message)
        );

        expect(() => fn(testTable, { by: ['foo'], expression: [averagePrice] })).toThrow(
          new RegExp(errors.columnNotFound('foo').message)
        );
      });
    });

    describe('expression', () => {
      it('returns the original datatable grouped by the specified columns', () => {
        testScheduler.run(({ expectObservable }) => {
          expectObservable(fn(testTable, { by: ['price', 'quantity'] })).toBe('(0|)', [
            expect.objectContaining({
              columns: expect.arrayContaining([
                expect.objectContaining({ name: 'price' }),
                expect.objectContaining({ name: 'quantity' }),
              ]),
              rows: expect.arrayContaining([
                expect.objectContaining({
                  price: expect.anything(),
                  quantity: expect.anything(),
                }),
              ]),
            }),
          ]);
        });
      });

      it('throws when row counts do not match across resulting datatables', () => {
        testScheduler.run(({ expectObservable }) => {
          expectObservable(
            fn(testTable, { by: ['name'], expression: [doublePrice, rowCount] })
          ).toBe(
            '#',
            [],
            expect.objectContaining({
              message: errors.rowCountMismatch().message,
            })
          );
        });
      });
    });
  });
});
