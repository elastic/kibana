/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getInterpolationValue } from './get_interpolation_value';

describe('getInterpolationValue', () => {
  it('returns 0 for no change', () => {
    expect(getInterpolationValue(8, 8)).toBe(0);
  });

  it('returns -1 when the background is undefined', () => {
    expect(getInterpolationValue(8, undefined)).toBe(1);
  });

  it('returns -1 when the background is 0', () => {
    expect(getInterpolationValue(8, 0)).toBe(1);
  });

  it('returns 0 when both values are equal', () => {
    expect(getInterpolationValue(1, 1)).toBe(0);
  });

  it('returns the correct positive change', () => {
    expect(getInterpolationValue(8, 5)).toBe(0.375);
  });

  it('returns the correct negative change', () => {
    expect(getInterpolationValue(5, 8)).toBe(-0.6);
  });

  it('returns the correct positive change with a denominator', () => {
    expect(getInterpolationValue(10, 8, 50)).toBe(0.04);
  });

  it('returns the correct negative change with a denominator', () => {
    expect(getInterpolationValue(8, 10, 50)).toBe(-0.04);
  });

  it('clamps changes', () => {
    expect(getInterpolationValue(5, 12)).toBe(-1);
  });
});
