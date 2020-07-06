/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { testTable } from './__tests__/fixtures/test_tables';
import { clear } from './clear';

describe('clear', () => {
  const fn = functionWrapper(clear);

  it('returns null for any context', () => {
    expect(fn()).toBe(null);
    expect(fn('foo')).toBe(null);
    expect(fn(2)).toBe(null);
    expect(fn(testTable)).toBe(null);
  });
});
