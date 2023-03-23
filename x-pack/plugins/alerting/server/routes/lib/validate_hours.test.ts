/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateHours } from './validate_hours';

describe('validateHours', () => {
  it('should be void for valid HH:mm formatted times', () => {
    expect(validateHours('12:15')).toBe(void 0);
  });

  it('should return error message if hour is not valid', () => {
    expect(validateHours('30:15')).toBe('string is not a valid time in HH:mm format 30:15');
  });

  it('should return error message if minute is not valid', () => {
    expect(validateHours('12:90')).toBe('string is not a valid time in HH:mm format 12:90');
  });

  it('should return error message if the string is not a time format', () => {
    expect(validateHours('foo')).toBe('string is not a valid time in HH:mm format foo');
  });

  it('should return error message if the string has seconds as well', () => {
    expect(validateHours('12:15:12')).toBe('string is not a valid time in HH:mm format 12:15:12');
  });
});
