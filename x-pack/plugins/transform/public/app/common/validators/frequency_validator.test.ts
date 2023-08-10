/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frequencyValidator } from './frequency_validator';

describe('Transform: frequencyValidator()', () => {
  const transformFrequencyValidator = (arg: string) => frequencyValidator(arg).length === 0;

  it('should fail when the input is not an integer and valid time unit.', () => {
    expect(transformFrequencyValidator('0')).toBe(false);
    expect(transformFrequencyValidator('0.1s')).toBe(false);
    expect(transformFrequencyValidator('1.1m')).toBe(false);
    expect(transformFrequencyValidator('10.1asdf')).toBe(false);
  });

  it('should only allow s/m/h as time unit.', () => {
    expect(transformFrequencyValidator('1ms')).toBe(false);
    expect(transformFrequencyValidator('1s')).toBe(true);
    expect(transformFrequencyValidator('1m')).toBe(true);
    expect(transformFrequencyValidator('1h')).toBe(true);
    expect(transformFrequencyValidator('1d')).toBe(false);
  });

  it('should only allow values above 0 and up to 1 hour.', () => {
    expect(transformFrequencyValidator('0s')).toBe(false);
    expect(transformFrequencyValidator('1s')).toBe(true);
    expect(transformFrequencyValidator('3599s')).toBe(true);
    expect(transformFrequencyValidator('3600s')).toBe(true);
    expect(transformFrequencyValidator('3601s')).toBe(false);
    expect(transformFrequencyValidator('10000s')).toBe(false);

    expect(transformFrequencyValidator('0m')).toBe(false);
    expect(transformFrequencyValidator('1m')).toBe(true);
    expect(transformFrequencyValidator('59m')).toBe(true);
    expect(transformFrequencyValidator('60m')).toBe(true);
    expect(transformFrequencyValidator('61m')).toBe(false);
    expect(transformFrequencyValidator('100m')).toBe(false);

    expect(transformFrequencyValidator('0h')).toBe(false);
    expect(transformFrequencyValidator('1h')).toBe(true);
    expect(transformFrequencyValidator('2h')).toBe(false);
  });
});
