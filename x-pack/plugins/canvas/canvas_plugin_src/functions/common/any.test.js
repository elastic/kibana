/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { any } from './any';

describe('any', () => {
  const fn = functionWrapper(any);

  it('should return false with no conditions', () => {
    expect(fn(null, {})).toBe(false);
    expect(fn(null, { condition: [] })).toBe(false);
  });

  it('should return false when no conditions are true', () => {
    expect(fn(null, null, { condition: [false] })).toBe(false);
    expect(fn(null, { condition: [false, false, false] })).toBe(false);
  });

  it('should return false when all conditions are falsy', () => {
    expect(fn(null, { condition: [false, 0, '', null] })).toBe(false);
  });

  it('should return true when at least one condition is true', () => {
    expect(fn(null, { condition: [false, false, true] })).toBe(true);
    expect(fn(null, { condition: [false, true, true] })).toBe(true);
    expect(fn(null, { condition: [true, true, true] })).toBe(true);
  });

  it('should return true when at least one condition is truthy', () => {
    expect(fn(null, { condition: [false, 0, '', null, 1] })).toBe(true);
    expect(fn(null, { condition: [false, 0, 'hooray', null] })).toBe(true);
    expect(fn(null, { condition: [false, 0, {}, null] })).toBe(true);
  });
});
