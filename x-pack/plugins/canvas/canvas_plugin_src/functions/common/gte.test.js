/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '../../../../../../src/plugins/presentation_util/common/lib';
import { gte } from './gte';

describe('gte', () => {
  const fn = functionWrapper(gte);

  it('should return false when the types are different', () => {
    expect(fn(1, { value: '1' })).toBe(false);
    expect(fn(3, { value: '3' })).toBe(false);
  });

  it('should return true when greater than or equal to', () => {
    expect(fn(2, { value: 1 })).toBe(true);
    expect(fn(2, { value: 2 })).toBe(true);
    expect(fn('b', { value: 'a' })).toBe(true);
    expect(fn('b', { value: 'b' })).toBe(true);
    expect(fn('foo', { value: 'bar' })).toBe(true);
    expect(fn('foo', { value: 'foo' })).toBe(true);
  });

  it('should return false when less than', () => {
    expect(fn(1, { value: 2 })).toBe(false);
    expect(fn('a', { value: 'b' })).toBe(false);
    expect(fn('bar', { value: 'foo' })).toBe(false);
  });
});
