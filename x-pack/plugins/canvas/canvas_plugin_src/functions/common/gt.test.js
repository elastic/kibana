/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { gt } from './gt';

describe('gt', () => {
  const fn = functionWrapper(gt);

  it('should return false when the types are different', () => {
    expect(fn(1, { value: '1' })).toBe(false);
    expect(fn('3', { value: 3 })).toBe(false);
  });

  it('should return true when greater than', () => {
    expect(fn(2, { value: 1 })).toBe(true);
    expect(fn('b', { value: 'a' })).toBe(true);
    expect(fn('foo', { value: 'bar' })).toBe(true);
  });

  it('should return false when less than or equal to', () => {
    expect(fn(1, { value: 2 })).toBe(false);
    expect(fn(2, { value: 2 })).toBe(false);
    expect(fn('a', { value: 'b' })).toBe(false);
    expect(fn('bar', { value: 'foo' })).toBe(false);
    expect(fn('foo', { value: 'foo' })).toBe(false);
  });
});
