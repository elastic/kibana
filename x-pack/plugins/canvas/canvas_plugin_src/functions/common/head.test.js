/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '../../../test_helpers/function_wrapper';
import { emptyTable, testTable } from './__fixtures__/test_tables';
import { head } from './head';

describe('head', () => {
  const fn = functionWrapper(head);

  it('returns a datatable with the first N rows of the context', () => {
    const result = fn(testTable, { count: 2 });

    expect(result.type).toBe('datatable');
    expect(result.columns).toEqual(testTable.columns);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(testTable.rows[0]);
    expect(result.rows[1]).toEqual(testTable.rows[1]);
  });

  it('returns the original context if N >= context.rows.length', () => {
    expect(fn(testTable, { count: testTable.rows.length + 5 })).toEqual(testTable);
    expect(fn(testTable, { count: testTable.rows.length })).toEqual(testTable);
    expect(fn(emptyTable)).toEqual(emptyTable);
  });

  it('returns the first row if N is not specified', () => {
    const result = fn(testTable);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual(testTable.rows[0]);
  });
});
