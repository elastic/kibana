/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { percentToFactor } from './percent_to_factor'; // Replace 'yourFile' with the actual file path

describe('percentToFactor function', () => {
  it('should convert 6% to factor 0.94', () => {
    expect(percentToFactor(6)).toBe(0.94);
  });

  it('should convert 0% to factor 1', () => {
    expect(percentToFactor(0)).toBe(1);
  });

  it('should convert 100% to factor 0', () => {
    expect(percentToFactor(100)).toBe(0);
  });

  it('should handle negative input, convert -10% to factor 1.1', () => {
    expect(percentToFactor(-10)).toBe(1.1);
  });

  it('should handle decimal input, convert 3.5% to factor 0.965', () => {
    expect(percentToFactor(3.5)).toBe(0.965);
  });

  it('should handle large input, convert 1000% to factor -9', () => {
    expect(percentToFactor(1000)).toBe(-9);
  });
});
