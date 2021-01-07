/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../test_helpers/function_wrapper';
import { getFunctionErrors } from '../../../i18n';
import { testTable } from './__fixtures__/test_tables';
import { ply } from './ply';

const errors = getFunctionErrors().ply;

const averagePrice = (datatable) => {
  const average = datatable.rows.reduce((sum, row) => sum + row.price, 0) / datatable.rows.length;

  return Promise.resolve({
    type: 'datatable',
    columns: [{ id: 'average_price', name: 'average_price', meta: { type: 'number' } }],
    rows: [{ average_price: average }],
  });
};

const doublePrice = (datatable) => {
  const newRows = datatable.rows.map((row) => ({ double_price: row.price * 2 }));

  return Promise.resolve({
    type: 'datatable',
    columns: [{ id: 'double_price', name: 'double_price', meta: { type: 'number' } }],
    rows: newRows,
  });
};

const rowCount = (datatable) => {
  return Promise.resolve({
    type: 'datatable',
    columns: [{ id: 'row_count', name: 'row_count', meta: { type: 'number' } }],
    rows: [
      {
        row_count: datatable.rows.length,
      },
    ],
  });
};

describe('ply', () => {
  const fn = functionWrapper(ply);

  it('maps a function over sub datatables grouped by specified columns and merges results into one datatable', () => {
    const arbitaryRowIndex = 0;

    return fn(testTable, { by: ['name', 'in_stock'], expression: [averagePrice, rowCount] }).then(
      (result) => {
        expect(result.type).toBe('datatable');
        expect(result.columns).toEqual([
          { id: 'name', name: 'name', meta: { type: 'string' } },
          { id: 'in_stock', name: 'in_stock', meta: { type: 'boolean' } },
          { id: 'average_price', name: 'average_price', meta: { type: 'number' } },
          { id: 'row_count', name: 'row_count', meta: { type: 'number' } },
        ]);
        expect(result.rows[arbitaryRowIndex]).toHaveProperty('average_price');
        expect(result.rows[arbitaryRowIndex]).toHaveProperty('row_count');
      }
    );
  });

  describe('missing args', () => {
    it('returns the original datatable if both args are missing', () => {
      return fn(testTable).then((result) => expect(result).toEqual(testTable));
    });

    describe('by', () => {
      it('passes the entire context into the expression when no columns are provided', () => {
        return fn(testTable, { expression: [rowCount] }).then((result) =>
          expect(result).toEqual({
            type: 'datatable',
            rows: [{ row_count: testTable.rows.length }],
            columns: [{ id: 'row_count', name: 'row_count', meta: { type: 'number' } }],
          })
        );
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
        const arbitaryRowIndex = 6;

        return fn(testTable, { by: ['price', 'quantity'] }).then((result) => {
          expect(result.columns[0]).toHaveProperty('name', 'price');
          expect(result.columns[1]).toHaveProperty('name', 'quantity');
          expect(result.rows[arbitaryRowIndex]).toHaveProperty('price');
          expect(result.rows[arbitaryRowIndex]).toHaveProperty('quantity');
        });
      });

      it('throws when row counts do not match across resulting datatables', () => {
        return fn(testTable, { by: ['name'], expression: [doublePrice, rowCount] }).catch((e) =>
          expect(e.message).toBe(errors.rowCountMismatch().message)
        );
      });
    });
  });
});
