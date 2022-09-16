/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getInterpolationValue } from './get_interpolation_value';

describe('getInterpolationValue', () => {
  it('returns 0 for no change', () => {
    expect(getInterpolationValue(100, 100)).toBe(0);
  });

  it('returns -1 when the background is undefined', () => {
    expect(getInterpolationValue(100, undefined)).toBe(-1);
  });

  it('returns -1 when the background is 0', () => {
    expect(getInterpolationValue(100, 0)).toBe(-1);
  });

  it('returns 0 when both values are 0', () => {
    expect(getInterpolationValue(0, 0)).toBe(0);
  });

  it('returns the correct value on positive changes', () => {
    expect(getInterpolationValue(100, 120)).toBeCloseTo(0.1);
    expect(getInterpolationValue(80, 100)).toBeCloseTo(0.125);

    expect(getInterpolationValue(90, 270)).toBeCloseTo(1);
  });

  it('returns the correct value on negative changes', () => {
    expect(getInterpolationValue(160, 120)).toBeCloseTo(-0.5);
    expect(getInterpolationValue(150, 100)).toBeCloseTo(-2 / 3);
  });

  it('clamps the value', () => {
    expect(getInterpolationValue(90, 360)).toBeCloseTo(1);
    expect(getInterpolationValue(360, 90)).toBeCloseTo(-1);
  });
});
