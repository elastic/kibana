/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { all } from './all';

describe('all', () => {
  const fn = functionWrapper(all);

  it('should return true with no conditions', () => {
    expect(fn(null, {})).toBe(true);
    expect(fn(null, { condition: [] })).toBe(true);
  });

  it('should return true when all conditions are true', () => {
    expect(fn(null, { condition: [true] })).toBe(true);
    expect(fn(null, { condition: [true, true, true] })).toBe(true);
  });

  it('should return true when all conditions are truthy', () => {
    expect(fn(null, { condition: [true, 1, 'hooray', {}] })).toBe(true);
  });

  it('should return false when at least one condition is false', () => {
    expect(fn(null, { condition: [false, true, true] })).toBe(false);
    expect(fn(null, { condition: [false, false, true] })).toBe(false);
    expect(fn(null, { condition: [false, false, false] })).toBe(false);
  });

  it('should return false when at least one condition is falsy', () => {
    expect(fn(null, { condition: [true, 0, 'hooray', {}] })).toBe(false);
    expect(fn(null, { condition: [true, 1, 'hooray', null] })).toBe(false);
    expect(fn(null, { condition: [true, 1, '', {}] })).toBe(false);
  });
});
