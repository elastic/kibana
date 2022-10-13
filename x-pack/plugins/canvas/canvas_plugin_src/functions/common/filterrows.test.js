/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { testTable } from './__fixtures__/test_tables';
import { filterrows } from './filterrows';

const inStock = (datatable) => of(datatable.rows[0].in_stock);
const returnFalse = () => of(false);

describe('filterrows', () => {
  let testScheduler;
  const fn = functionWrapper(filterrows);

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => expect(actual).toStrictEqual(expected));
  });

  it('returns a datable', () => {
    testScheduler.run(({ expectObservable }) =>
      expectObservable(fn(testTable, { fn: inStock })).toBe('(0|)', [
        expect.objectContaining({ type: 'datatable' }),
      ])
    );
  });

  it('keeps rows that evaluate to true and removes rows that evaluate to false', () => {
    const inStockRows = testTable.rows.filter((row) => row.in_stock);

    testScheduler.run(({ expectObservable }) =>
      expectObservable(fn(testTable, { fn: inStock })).toBe('(0|)', [
        expect.objectContaining({
          columns: testTable.columns,
          rows: inStockRows,
        }),
      ])
    );
  });

  it('returns datatable with no rows when no rows meet function condition', () => {
    testScheduler.run(({ expectObservable }) =>
      expectObservable(fn(testTable, { fn: returnFalse })).toBe('(0|)', [
        expect.objectContaining({
          rows: [],
        }),
      ])
    );
  });

  it('throws when no function is provided', () => {
    testScheduler.run(({ expectObservable }) =>
      expectObservable(fn(testTable)).toBe('#', {}, new TypeError('fn is not a function'))
    );
  });
});
