/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frequencyValidator } from './frequency_validator';

describe('Transform: frequencyValidator()', () => {
  it('should fail when the input is not an integer and valid time unit.', () => {
    expect(frequencyValidator('0')).toEqual(['The frequency value is not valid.']);
    expect(frequencyValidator('0.1s')).toEqual(['The frequency value is not valid.']);
    expect(frequencyValidator('1.1m')).toEqual(['The frequency value is not valid.']);
    expect(frequencyValidator('10.1asdf')).toEqual(['The frequency value is not valid.']);
  });

  it('should only allow s/m/h as time unit.', () => {
    expect(frequencyValidator('1ms')).toEqual(['The frequency value is not valid.']);
    expect(frequencyValidator('1s')).toEqual([]);
    expect(frequencyValidator('1m')).toEqual([]);
    expect(frequencyValidator('1h')).toEqual([]);
    expect(frequencyValidator('1d')).toEqual(['The frequency value is not valid.']);
  });

  it('should only allow values above 0 and up to 1 hour.', () => {
    expect(frequencyValidator('0s')).toEqual(['The frequency value is not valid.']);
    expect(frequencyValidator('1s')).toEqual([]);
    expect(frequencyValidator('3599s')).toEqual([]);
    expect(frequencyValidator('3600s')).toEqual([]);
    expect(frequencyValidator('3601s')).toEqual(['The frequency value is not valid.']);
    expect(frequencyValidator('10000s')).toEqual(['The frequency value is not valid.']);

    expect(frequencyValidator('0m')).toEqual(['The frequency value is not valid.']);
    expect(frequencyValidator('1m')).toEqual([]);
    expect(frequencyValidator('59m')).toEqual([]);
    expect(frequencyValidator('60m')).toEqual([]);
    expect(frequencyValidator('61m')).toEqual(['The frequency value is not valid.']);
    expect(frequencyValidator('100m')).toEqual(['The frequency value is not valid.']);

    expect(frequencyValidator('0h')).toEqual(['The frequency value is not valid.']);
    expect(frequencyValidator('1h')).toEqual([]);
    expect(frequencyValidator('2h')).toEqual(['The frequency value is not valid.']);
  });
});
