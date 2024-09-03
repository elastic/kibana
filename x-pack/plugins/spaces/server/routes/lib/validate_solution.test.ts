/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidSpaceSolution } from './validate_solution';

describe('isValidSpaceSolution', () => {
  it('should return true for a valid solution "classic"', () => {
    expect(isValidSpaceSolution('classic')).toBe(true);
  });

  it('should return true for a valid solution "es"', () => {
    expect(isValidSpaceSolution('es')).toBe(true);
  });

  it('should return true for a valid solution "oblt"', () => {
    expect(isValidSpaceSolution('oblt')).toBe(true);
  });

  it('should return true for a valid solution "security"', () => {
    expect(isValidSpaceSolution('security')).toBe(true);
  });

  it('should return false for an invalid solution', () => {
    expect(isValidSpaceSolution('invalid')).toBe(false);
  });

  it('should return false for undefined input', () => {
    expect(isValidSpaceSolution(undefined)).toBe(false);
  });

  it('should return false for null input', () => {
    expect(isValidSpaceSolution(null)).toBe(false);
  });

  it('should return false for number input', () => {
    expect(isValidSpaceSolution(123)).toBe(false);
  });

  it('should return false for object input', () => {
    expect(isValidSpaceSolution({})).toBe(false);
  });

  it('should return false for array input', () => {
    expect(isValidSpaceSolution(['classic'])).toBe(false);
  });
});
