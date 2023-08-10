/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration } from './parse_duration';

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
