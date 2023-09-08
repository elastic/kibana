/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidNumericType } from './is_valid_numeric_type';

describe('isValidNumericType', () => {
  it('should validate valid numbers', () => {
    expect(isValidNumericType(6376723)).toBe(true);
    expect(isValidNumericType(-6376723)).toBe(true);
    expect(isValidNumericType(637672363767236376723637672363767236376723)).toBe(true);
    expect(isValidNumericType(-637672363767236376723637672363767236376723)).toBe(true);
    expect(isValidNumericType(0)).toBe(true);
    expect(isValidNumericType(63767236376723637672363.7672363767236376723)).toBe(true);
    expect(isValidNumericType(-63767236376723637672363.7672363767236376723)).toBe(true);
  });

  it('should validate strings that can be parsed as valid numbers', () => {
    expect(isValidNumericType('6376723')).toBe(true);
    expect(isValidNumericType('-6376723')).toBe(true);
    expect(isValidNumericType('637672363767236376723637672363767236376723')).toBe(true);
    expect(isValidNumericType('-637672363767236376723637672363767236376723')).toBe(true);
    expect(isValidNumericType('0')).toBe(true);
    expect(isValidNumericType('63767236376723637672363.7672363767236376723')).toBe(true);
    expect(isValidNumericType('-63767236376723637672363.7672363767236376723')).toBe(true);
  });

  it('should validate string with space', () => {
    expect(isValidNumericType('24 ')).toBe(true);
  });

  it('should not validate invalid values', () => {
    expect(isValidNumericType('non-valid')).toBe(false);
    expect(isValidNumericType(true)).toBe(false);
    expect(isValidNumericType([])).toBe(false);
    expect(isValidNumericType({})).toBe(false);
    expect(isValidNumericType('2015x')).toBe(false);
    expect(isValidNumericType('-2015x')).toBe(false);
    expect(isValidNumericType('201.2s')).toBe(false);
    expect(isValidNumericType(undefined)).toBe(false);
  });
});
