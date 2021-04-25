/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { functionWrapper } from '../../../test_helpers/function_wrapper';
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

  it('maps a function over sub datatables grouped by specified columns and merges results into one datatable', async () => {
    const arbitaryRowIndex = 0;
    const result = await fn(testTable, {
      by: ['name', 'in_stock'],
      expression: [averagePrice, rowCount],
    });

    expect(result.type).toBe('datatable');
    expect(result.columns).toEqual([
      { id: 'name', name: 'name', meta: { type: 'string' } },
      { id: 'in_stock', name: 'in_stock', meta: { type: 'boolean' } },
      { id: 'average_price', name: 'average_price', meta: { type: 'number' } },
      { id: 'row_count', name: 'row_count', meta: { type: 'number' } },
    ]);
    expect(result.rows[arbitaryRowIndex]).toHaveProperty('average_price');
    expect(result.rows[arbitaryRowIndex]).toHaveProperty('row_count');
  });

  describe('missing args', () => {
    it('returns the original datatable if both args are missing', () => {
      expect(fn(testTable)).resolves.toEqual(testTable);
    });

    describe('by', () => {
      it('passes the entire context into the expression when no columns are provided', () => {
        expect(fn(testTable, { expression: [rowCount] })).resolves.toEqual({
          type: 'datatable',
          rows: [{ row_count: testTable.rows.length }],
          columns: [{ id: 'row_count', name: 'row_count', meta: { type: 'number' } }],
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
      it('returns the original datatable grouped by the specified columns', async () => {
        const arbitaryRowIndex = 6;
        const result = await fn(testTable, { by: ['price', 'quantity'] });

        expect(result.columns[0]).toHaveProperty('name', 'price');
        expect(result.columns[1]).toHaveProperty('name', 'quantity');
        expect(result.rows[arbitaryRowIndex]).toHaveProperty('price');
        expect(result.rows[arbitaryRowIndex]).toHaveProperty('quantity');
      });

      it('throws when row counts do not match across resulting datatables', () => {
        expect(
          fn(testTable, { by: ['name'], expression: [doublePrice, rowCount] })
        ).rejects.toEqual(
          expect.objectContaining({
            message: errors.rowCountMismatch().message,
          })
        );
      });
    });
  });
});
