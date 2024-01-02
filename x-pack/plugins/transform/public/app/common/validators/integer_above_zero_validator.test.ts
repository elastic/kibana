/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { integerAboveZeroValidator } from './integer_above_zero_validator';

describe('Transform: integerAboveZeroValidator()', () => {
  it('should only allow integers above zero', () => {
    // invalid
    expect(integerAboveZeroValidator('a-string')).toEqual([
      'Value needs to be an integer above zero.',
    ]);
    expect(integerAboveZeroValidator('0s')).toEqual(['Value needs to be an integer above zero.']);
    expect(integerAboveZeroValidator('1m')).toEqual(['Value needs to be an integer above zero.']);
    expect(integerAboveZeroValidator('1..')).toEqual(['Value needs to be an integer above zero.']);
    expect(integerAboveZeroValidator(-1)).toEqual(['Value needs to be an integer above zero.']);
    expect(integerAboveZeroValidator(0)).toEqual(['Value needs to be an integer above zero.']);
    expect(integerAboveZeroValidator(0.1)).toEqual(['Value needs to be an integer above zero.']);

    // valid
    expect(integerAboveZeroValidator(1)).toEqual([]);
    expect(integerAboveZeroValidator('1')).toEqual([]);
    expect(integerAboveZeroValidator('1.')).toEqual([]);
    expect(integerAboveZeroValidator('1.0')).toEqual([]);
  });
});
