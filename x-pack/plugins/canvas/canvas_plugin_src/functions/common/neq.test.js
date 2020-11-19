/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { neq } from './neq';

describe('neq', () => {
  const fn = functionWrapper(neq);

  it('should return true when the types are different', () => {
    expect(fn(1, { value: '1' })).toBe(true);
    expect(fn(true, { value: 'true' })).toBe(true);
    expect(fn(null, { value: 'null' })).toBe(true);
  });

  it('should return true when the values are different', () => {
    expect(fn(1, { value: 2 })).toBe(true);
    expect(fn('foo', { value: 'bar' })).toBe(true);
    expect(fn(true, { value: false })).toBe(true);
  });

  it('should return false when the values are the same', () => {
    expect(fn(1, { value: 1 })).toBe(false);
    expect(fn('foo', { value: 'foo' })).toBe(false);
    expect(fn(true, { value: true })).toBe(false);
    expect(fn(null, { value: null })).toBe(false);
  });
});
