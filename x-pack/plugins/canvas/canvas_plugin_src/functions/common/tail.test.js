/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { emptyTable, testTable } from './__tests__/fixtures/test_tables';
import { tail } from './tail';

describe('tail', () => {
  const fn = functionWrapper(tail);
  const lastIndex = testTable.rows.length - 1;

  it('returns a datatable with the last N rows of the context', () => {
    const result = fn(testTable, { count: 2 });

    expect(result.type).toBe('datatable');
    expect(result.columns).toEqual(testTable.columns);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(testTable.rows[lastIndex - 1]);
    expect(result.rows[1]).toEqual(testTable.rows[lastIndex]);
  });

  it('returns the original context if N >= context.rows.length', () => {
    expect(fn(testTable, { count: testTable.rows.length + 5 })).toEqual(testTable);
    expect(fn(testTable, { count: testTable.rows.length })).toEqual(testTable);
    expect(fn(emptyTable)).toEqual(emptyTable);
  });

  it('returns the last row if N is not specified', () => {
    const result = fn(testTable);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual(testTable.rows[lastIndex]);
  });
});
