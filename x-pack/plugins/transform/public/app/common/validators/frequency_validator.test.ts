/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frequencyValidator } from './frequency_validator';

describe('Transform: frequencyValidator()', () => {
  // frequencyValidator() returns an array of error messages so
  // an array with a length of 0 means a successful validation.

  it('should fail when the input is not an integer and valid time unit.', () => {
    expect(frequencyValidator('0')).toHaveLength(1);
    expect(frequencyValidator('0.1s')).toHaveLength(1);
    expect(frequencyValidator('1.1m')).toHaveLength(1);
    expect(frequencyValidator('10.1asdf')).toHaveLength(1);
  });

  it('should only allow s/m/h as time unit.', () => {
    expect(frequencyValidator('1ms')).toHaveLength(1);
    expect(frequencyValidator('1s')).toHaveLength(0);
    expect(frequencyValidator('1m')).toHaveLength(0);
    expect(frequencyValidator('1h')).toHaveLength(0);
    expect(frequencyValidator('1d')).toHaveLength(1);
  });

  it('should only allow values above 0 and up to 1 hour.', () => {
    expect(frequencyValidator('0s')).toHaveLength(1);
    expect(frequencyValidator('1s')).toHaveLength(0);
    expect(frequencyValidator('3599s')).toHaveLength(0);
    expect(frequencyValidator('3600s')).toHaveLength(0);
    expect(frequencyValidator('3601s')).toHaveLength(1);
    expect(frequencyValidator('10000s')).toHaveLength(1);

    expect(frequencyValidator('0m')).toHaveLength(1);
    expect(frequencyValidator('1m')).toHaveLength(0);
    expect(frequencyValidator('59m')).toHaveLength(0);
    expect(frequencyValidator('60m')).toHaveLength(0);
    expect(frequencyValidator('61m')).toHaveLength(1);
    expect(frequencyValidator('100m')).toHaveLength(1);

    expect(frequencyValidator('0h')).toHaveLength(1);
    expect(frequencyValidator('1h')).toHaveLength(0);
    expect(frequencyValidator('2h')).toHaveLength(1);
  });
});
