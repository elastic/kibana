/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { continuousModeDelayValidator, transformFrequencyValidator } from './validators';

describe('continuousModeDelayValidator', () => {
  it('should allow 0 input without unit', () => {
    expect(continuousModeDelayValidator('0')).toBe(true);
  });

  it('should allow 0 input with unit provided', () => {
    expect(continuousModeDelayValidator('0s')).toBe(true);
  });

  it('should allow integer input with unit provided', () => {
    expect(continuousModeDelayValidator('234nanos')).toBe(true);
  });

  it('should not allow integer input without unit provided', () => {
    expect(continuousModeDelayValidator('90000')).toBe(false);
  });

  it('should not allow float input', () => {
    expect(continuousModeDelayValidator('122.5d')).toBe(false);
  });
});

describe('transformFrequencyValidator', () => {
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
