/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidSampleIndex } from './is_valid_sample_index';

describe('isValidSampleIndex', () => {
  const traceSamples = [{ id: 'a' }, { id: 'b' }];

  it('returns true for an in-bounds index', () => {
    expect(isValidSampleIndex(0, traceSamples)).toBe(true);
    expect(isValidSampleIndex(1, traceSamples)).toBe(true);
  });

  it('returns false when the index is undefined', () => {
    expect(isValidSampleIndex(undefined, traceSamples)).toBe(false);
  });

  it('returns false when traceSamples is undefined', () => {
    expect(isValidSampleIndex(0, undefined)).toBe(false);
  });

  it('returns false for a negative index', () => {
    expect(isValidSampleIndex(-1, traceSamples)).toBe(false);
  });

  it('returns false when the index is out of bounds', () => {
    expect(isValidSampleIndex(2, traceSamples)).toBe(false);
    expect(isValidSampleIndex(5, traceSamples)).toBe(false);
  });

  it('returns false for an empty samples array', () => {
    expect(isValidSampleIndex(0, [])).toBe(false);
  });
});
