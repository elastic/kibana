/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asWeight } from './as_weight';

describe('asWeight', () => {
  it('should correctly convert and format weight in pounds to kilograms', () => {
    const valueInPounds = 150;
    expect(asWeight(valueInPounds, 'lbs')).toBe('150 lbs / 68.04 kg');
  });

  it('should correctly convert and format weight in kilograms to pounds', () => {
    const valueInKilograms = 75;
    expect(asWeight(valueInKilograms, 'kgs')).toBe('165.35 lbs / 75 kg');
  });

  it('should handle NaN input', () => {
    expect(asWeight(NaN, 'lbs')).toBe('N/A lbs / N/A kg');
  });

  it('should handle zero input', () => {
    expect(asWeight(0, 'kgs')).toBe('0 lbs / 0 kg');
  });

  it('should format very small values in pounds as "~0.00"', () => {
    expect(asWeight(0.0001, 'lbs')).toBe('~0.00 lbs / ~0.00 kg');
  });
});
