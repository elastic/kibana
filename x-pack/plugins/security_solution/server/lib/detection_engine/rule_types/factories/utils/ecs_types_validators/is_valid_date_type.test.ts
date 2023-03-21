/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidDateType } from './is_valid_date_type';

describe('isValidDateType', () => {
  it('should validate valid string format dates', () => {
    expect(isValidDateType('2015-01-01T12:10:30.666Z')).toBe(true);
    expect(isValidDateType('2015-01-01T12:10:30.666')).toBe(true);
    expect(isValidDateType('2015-01-01T12:10:30Z')).toBe(true);
    expect(isValidDateType('2015-01-01T12:10:30')).toBe(true);
    expect(isValidDateType('2015-01-01T12:10Z')).toBe(true);
    expect(isValidDateType('2015-01-01T12:10')).toBe(true);
    expect(isValidDateType('2015-01-01T12Z')).toBe(true);
    expect(isValidDateType('2015-01-01T12')).toBe(true);
    expect(isValidDateType('2015-01-01T')).toBe(true);
    expect(isValidDateType('2015-01-01')).toBe(true);
    expect(isValidDateType('2015-01')).toBe(true);
    expect(isValidDateType('2015')).toBe(true);
  });

  it('should validate epoch ms date format', () => {
    expect(isValidDateType(387497835948)).toBe(true);
  });

  it('should not validate invalid dates', () => {
    expect(isValidDateType('non-valid')).toBe(false);
    expect(isValidDateType(true)).toBe(false);
    expect(isValidDateType([])).toBe(false);
    expect(isValidDateType('2022/12/12')).toBe(false);
    expect(isValidDateType('2015Z')).toBe(false);
    expect(isValidDateType('2015-01-')).toBe(false);
    expect(isValidDateType('2015-01-01T12: 10Z')).toBe(false);
    expect(isValidDateType('2015-20-20')).toBe(false);
  });
});
