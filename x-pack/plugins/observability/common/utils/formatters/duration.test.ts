/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  asDuration,
  asTransactionRate,
  toMicroseconds,
  asMillisecondDuration,
  formateDurationFromTimeUnitChar,
} from './duration';

describe('duration formatters', () => {
  describe('asDuration', () => {
    it('formats correctly with defaults', () => {
      expect(asDuration(null)).toEqual('N/A');
      expect(asDuration(undefined)).toEqual('N/A');
      expect(asDuration(0)).toEqual('0 μs');
      expect(asDuration(1)).toEqual('1 μs');
      expect(asDuration(toMicroseconds(1, 'milliseconds'))).toEqual('1,000 μs');
      expect(asDuration(toMicroseconds(1000, 'milliseconds'))).toEqual('1,000 ms');
      expect(asDuration(toMicroseconds(10000, 'milliseconds'))).toEqual('10,000 ms');
      expect(asDuration(toMicroseconds(20, 'seconds'))).toEqual('20 s');
      expect(asDuration(toMicroseconds(10, 'minutes'))).toEqual('600 s');
      expect(asDuration(toMicroseconds(11, 'minutes'))).toEqual('11 min');
      expect(asDuration(toMicroseconds(1, 'hours'))).toEqual('60 min');
      expect(asDuration(toMicroseconds(1.5, 'hours'))).toEqual('90 min');
      expect(asDuration(toMicroseconds(10, 'hours'))).toEqual('600 min');
      expect(asDuration(toMicroseconds(11, 'hours'))).toEqual('11 h');
    });

    it('falls back to default value', () => {
      expect(asDuration(undefined, { defaultValue: 'nope' })).toEqual('nope');
    });
  });

  describe('toMicroseconds', () => {
    it('transformes to microseconds', () => {
      expect(toMicroseconds(1, 'hours')).toEqual(3600000000);
      expect(toMicroseconds(10, 'minutes')).toEqual(600000000);
      expect(toMicroseconds(10, 'seconds')).toEqual(10000000);
      expect(toMicroseconds(10, 'milliseconds')).toEqual(10000);
    });
  });

  describe('asMilliseconds', () => {
    it('converts to formatted decimal milliseconds', () => {
      expect(asMillisecondDuration(0)).toEqual('0 ms');
    });
    it('formats correctly with undefined values', () => {
      expect(asMillisecondDuration(undefined)).toEqual('N/A');
    });
  });

  describe('formateDurationFromTimeUnitChar', () => {
    it('Convert "s" to "secs".', () => {
      expect(formateDurationFromTimeUnitChar(30, 's')).toEqual('30 secs');
    });
    it('Convert "s" to "sec."', () => {
      expect(formateDurationFromTimeUnitChar(1, 's')).toEqual('1 sec');
    });

    it('Convert "m" to "mins".', () => {
      expect(formateDurationFromTimeUnitChar(10, 'm')).toEqual('10 mins');
    });

    it('Convert "m" to "min."', () => {
      expect(formateDurationFromTimeUnitChar(1, 'm')).toEqual('1 min');
    });

    it('Convert "h" to "hrs."', () => {
      expect(formateDurationFromTimeUnitChar(5, 'h')).toEqual('5 hrs');
    });

    it('Convert "h" to "hr"', () => {
      expect(formateDurationFromTimeUnitChar(1, 'h')).toEqual('1 hr');
    });

    it('Convert "d" to "days"', () => {
      expect(formateDurationFromTimeUnitChar(2, 'd')).toEqual('2 days');
    });

    it('Convert "d" to "day"', () => {
      expect(formateDurationFromTimeUnitChar(1, 'd')).toEqual('1 day');
    });
  });
});
