/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { integerAboveZeroValidator } from './integer_above_zero_validator';

describe('Transform: integerAboveZeroValidator()', () => {
  it('should only allow integers above zero', () => {
    // integerAboveZeroValidator() returns an array of error messages so
    // an array with a length of 0 means a successful validation.

    // invalid
    expect(integerAboveZeroValidator('a-string')).toHaveLength(1);
    expect(integerAboveZeroValidator('0s')).toHaveLength(1);
    expect(integerAboveZeroValidator('1m')).toHaveLength(1);
    expect(integerAboveZeroValidator('1.')).toHaveLength(1);
    expect(integerAboveZeroValidator('1..')).toHaveLength(1);
    expect(integerAboveZeroValidator('1.0')).toHaveLength(1);
    expect(integerAboveZeroValidator(-1)).toHaveLength(1);
    expect(integerAboveZeroValidator(0)).toHaveLength(1);
    expect(integerAboveZeroValidator(0.1)).toHaveLength(1);

    // valid
    expect(integerAboveZeroValidator(1)).toHaveLength(0);
    expect(integerAboveZeroValidator('1')).toHaveLength(0);
  });
});
