/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { eq } from './eq';

describe('eq', () => {
  const fn = functionWrapper(eq);

  it('should return false when the types are different', () => {
    expect(fn(1, { value: '1' })).toBe(false);
    expect(fn(true, { value: 'true' })).toBe(false);
    expect(fn(null, { value: 'null' })).toBe(false);
  });

  it('should return false when the values are different', () => {
    expect(fn(1, { value: 2 })).toBe(false);
    expect(fn('foo', { value: 'bar' })).toBe(false);
    expect(fn(true, { value: false })).toBe(false);
  });

  it('should return true when the values are the same', () => {
    expect(fn(1, { value: 1 })).toBe(true);
    expect(fn('foo', { value: 'foo' })).toBe(true);
    expect(fn(true, { value: true })).toBe(true);
    expect(fn(null, { value: null })).toBe(true);
  });
});
