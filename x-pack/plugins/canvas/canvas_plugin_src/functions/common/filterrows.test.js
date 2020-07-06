/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { testTable } from './__tests__/fixtures/test_tables';
import { filterrows } from './filterrows';

const inStock = (datatable) => datatable.rows[0].in_stock;
const returnFalse = () => false;

describe('filterrows', () => {
  const fn = functionWrapper(filterrows);

  it('returns a datable', () => {
    return fn(testTable, { fn: inStock }).then((result) => {
      expect(result).toHaveProperty('type', 'datatable');
    });
  });

  it('keeps rows that evaluate to true and removes rows that evaluate to false', () => {
    const inStockRows = testTable.rows.filter((row) => row.in_stock);

    return fn(testTable, { fn: inStock }).then((result) => {
      expect(result.columns).toEqual(testTable.columns);
      expect(result.rows).toEqual(inStockRows);
    });
  });

  it('returns datatable with no rows when no rows meet function condition', () => {
    return fn(testTable, { fn: returnFalse }).then((result) => {
      expect(result.rows).toEqual([]);
    });
  });

  it('throws when no function is provided', () => {
    expect(() => fn(testTable)).toThrow('fn is not a function');
  });
});
