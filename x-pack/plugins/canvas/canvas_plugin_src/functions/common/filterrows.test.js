/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { functionWrapper } from '../../../test_helpers/function_wrapper';
import { testTable } from './__fixtures__/test_tables';
import { filterrows } from './filterrows';

const inStock = (datatable) => of(datatable.rows[0].in_stock);
const returnFalse = () => of(false);

describe('filterrows', () => {
  const fn = functionWrapper(filterrows);

  it('returns a datable', () => {
    expect(fn(testTable, { fn: inStock })).resolves.toHaveProperty('type', 'datatable');
  });

  it('keeps rows that evaluate to true and removes rows that evaluate to false', () => {
    const inStockRows = testTable.rows.filter((row) => row.in_stock);

    expect(fn(testTable, { fn: inStock })).resolves.toEqual(
      expect.objectContaining({
        columns: testTable.columns,
        rows: inStockRows,
      })
    );
  });

  it('returns datatable with no rows when no rows meet function condition', () => {
    expect(fn(testTable, { fn: returnFalse })).resolves.toEqual(
      expect.objectContaining({
        rows: [],
      })
    );
  });

  it('throws when no function is provided', () => {
    expect(() => fn(testTable)).toThrow('fn is not a function');
  });
});
