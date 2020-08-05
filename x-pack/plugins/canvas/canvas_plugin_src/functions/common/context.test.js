/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { testTable, emptyTable } from './__tests__/fixtures/test_tables';
import { context } from './context';

describe('context', () => {
  const fn = functionWrapper(context);

  it('returns whatever context you pass into', () => {
    expect(fn(null)).toBe(null);
    expect(fn(true)).toBe(true);
    expect(fn(1)).toBe(1);
    expect(fn('foo')).toBe('foo');
    expect(fn({})).toEqual({});
    expect(fn(emptyTable)).toEqual(emptyTable);
    expect(fn(testTable)).toEqual(testTable);
  });
});
