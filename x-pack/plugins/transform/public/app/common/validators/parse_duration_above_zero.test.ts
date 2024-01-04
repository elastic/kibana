/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDurationAboveZero } from './parse_duration_above_zero';

describe('parseDurationAboveZero', () => {
  it('should return error when the input is not an integer and valid time unit.', () => {
    expect(parseDurationAboveZero('0')).toEqual(['The frequency value is not valid.']);
    expect(parseDurationAboveZero('0.1s')).toEqual(['The frequency value is not valid.']);
    expect(parseDurationAboveZero('1.1m')).toEqual(['The frequency value is not valid.']);
    expect(parseDurationAboveZero('10.1asdf')).toEqual(['The frequency value is not valid.']);
  });

  it('should return parsed data for valid time units nanos|micros|ms|s|m|h|d.', () => {
    expect(parseDurationAboveZero('1a')).toEqual(['The frequency value is not valid.']);
    expect(parseDurationAboveZero('1nanos')).toEqual({
      number: 1,
      timeUnit: 'nanos',
    });
    expect(parseDurationAboveZero('1micros')).toEqual({
      number: 1,
      timeUnit: 'micros',
    });
    expect(parseDurationAboveZero('1ms')).toEqual({ number: 1, timeUnit: 'ms' });
    expect(parseDurationAboveZero('1s')).toEqual({ number: 1, timeUnit: 's' });
    expect(parseDurationAboveZero('1m')).toEqual({ number: 1, timeUnit: 'm' });
    expect(parseDurationAboveZero('1h')).toEqual({ number: 1, timeUnit: 'h' });
    expect(parseDurationAboveZero('1d')).toEqual({ number: 1, timeUnit: 'd' });
  });
});
