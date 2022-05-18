/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { lte } from './lte';

describe('lte', () => {
  const fn = functionWrapper(lte);

  it('should return false when the types are different', () => {
    expect(fn(1, { value: '1' })).toBe(false);
    expect(fn('3', { value: 3 })).toBe(false);
  });

  it('should return false when greater than', () => {
    expect(fn(2, { value: 1 })).toBe(false);
    expect(fn('b', { value: 'a' })).toBe(false);
    expect(fn('foo', { value: 'bar' })).toBe(false);
  });

  it('should return true when less than or equal to', () => {
    expect(fn(1, { value: 2 })).toBe(true);
    expect(fn(2, { value: 2 })).toBe(true);
    expect(fn('a', { value: 'b' })).toBe(true);
    expect(fn('a', { value: 'a' })).toBe(true);
    expect(fn('bar', { value: 'foo' })).toBe(true);
    expect(fn('foo', { value: 'foo' })).toBe(true);
  });
});
