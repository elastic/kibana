/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  continuousModeDelayValidator,
  parseDuration,
  retentionPolicyMaxAgeValidator,
  transformFrequencyValidator,
} from './validators';

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

describe('parseDuration', () => {
  it('should return undefined when the input is not an integer and valid time unit.', () => {
    expect(parseDuration('0')).toBe(undefined);
    expect(parseDuration('0.1s')).toBe(undefined);
    expect(parseDuration('1.1m')).toBe(undefined);
    expect(parseDuration('10.1asdf')).toBe(undefined);
  });

  it('should return parsed data for valid time units nanos|micros|ms|s|m|h|d.', () => {
    expect(parseDuration('1a')).toEqual(undefined);
    expect(parseDuration('1nanos')).toEqual({
      number: 1,
      timeUnit: 'nanos',
    });
    expect(parseDuration('1micros')).toEqual({
      number: 1,
      timeUnit: 'micros',
    });
    expect(parseDuration('1ms')).toEqual({ number: 1, timeUnit: 'ms' });
    expect(parseDuration('1s')).toEqual({ number: 1, timeUnit: 's' });
    expect(parseDuration('1m')).toEqual({ number: 1, timeUnit: 'm' });
    expect(parseDuration('1h')).toEqual({ number: 1, timeUnit: 'h' });
    expect(parseDuration('1d')).toEqual({ number: 1, timeUnit: 'd' });
  });
});

describe('retentionPolicyMaxAgeValidator', () => {
  it('should fail when the input is not an integer and valid time unit.', () => {
    expect(retentionPolicyMaxAgeValidator('0')).toBe(false);
    expect(retentionPolicyMaxAgeValidator('0.1s')).toBe(false);
    expect(retentionPolicyMaxAgeValidator('1.1m')).toBe(false);
    expect(retentionPolicyMaxAgeValidator('10.1asdf')).toBe(false);
  });

  it('should only allow values equal or above 60s.', () => {
    expect(retentionPolicyMaxAgeValidator('0nanos')).toBe(false);
    expect(retentionPolicyMaxAgeValidator('59999999999nanos')).toBe(false);
    expect(retentionPolicyMaxAgeValidator('60000000000nanos')).toBe(true);
    expect(retentionPolicyMaxAgeValidator('60000000001nanos')).toBe(true);

    expect(retentionPolicyMaxAgeValidator('0micros')).toBe(false);
    expect(retentionPolicyMaxAgeValidator('59999999micros')).toBe(false);
    expect(retentionPolicyMaxAgeValidator('60000000micros')).toBe(true);
    expect(retentionPolicyMaxAgeValidator('60000001micros')).toBe(true);

    expect(retentionPolicyMaxAgeValidator('0ms')).toBe(false);
    expect(retentionPolicyMaxAgeValidator('59999ms')).toBe(false);
    expect(retentionPolicyMaxAgeValidator('60000ms')).toBe(true);
    expect(retentionPolicyMaxAgeValidator('60001ms')).toBe(true);

    expect(retentionPolicyMaxAgeValidator('0s')).toBe(false);
    expect(retentionPolicyMaxAgeValidator('1s')).toBe(false);
    expect(retentionPolicyMaxAgeValidator('59s')).toBe(false);
    expect(retentionPolicyMaxAgeValidator('60s')).toBe(true);
    expect(retentionPolicyMaxAgeValidator('61s')).toBe(true);
    expect(retentionPolicyMaxAgeValidator('10000s')).toBe(true);

    expect(retentionPolicyMaxAgeValidator('0m')).toBe(false);
    expect(retentionPolicyMaxAgeValidator('1m')).toBe(true);
    expect(retentionPolicyMaxAgeValidator('100m')).toBe(true);

    expect(retentionPolicyMaxAgeValidator('0h')).toBe(false);
    expect(retentionPolicyMaxAgeValidator('1h')).toBe(true);
    expect(retentionPolicyMaxAgeValidator('2h')).toBe(true);
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
