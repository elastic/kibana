/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  asDuration,
  getDurationFormatter,
  toMicroseconds,
  asMillisecondDuration,
} from './duration';

describe('duration formatters', () => {
  describe('asDuration', () => {
    it('formats correctly with defaults', () => {
      expect(asDuration(null)).toEqual('N/A');
      expect(asDuration(undefined)).toEqual('N/A');
      expect(asDuration(0)).toEqual('0 μs');
      expect(asDuration(1)).toEqual('1 μs');
      expect(asDuration(toMicroseconds(1, 'milliseconds'))).toEqual('1,000 μs');
      expect(asDuration(toMicroseconds(1000, 'milliseconds'))).toEqual(
        '1,000 ms'
      );
      expect(asDuration(toMicroseconds(10000, 'milliseconds'))).toEqual(
        '10,000 ms'
      );
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

  describe('getDurationFormatter', () => {
    // Formatting with a default threshold of 10 for more detail for single values
    it('formats correctly with defaults', () => {
      expect(getDurationFormatter(987654)(987654).formatted).toEqual('988 ms');
      expect(getDurationFormatter(1000000)(1000000).formatted).toEqual(
        '1,000 ms'
      );
      expect(getDurationFormatter(1234567)(1234567).formatted).toEqual(
        '1,235 ms'
      );
      expect(getDurationFormatter(9876543)(9876543).formatted).toEqual(
        '9,877 ms'
      );
      expect(getDurationFormatter(10000000)(10000000).formatted).toEqual(
        '10,000 ms'
      );
      expect(getDurationFormatter(12345678)(12345678).formatted).toEqual(
        '12 s'
      );
    });

    // Formatting useful for axis ticks with a lower threshold where less detail is sufficient
    it('formats correctly with a threshold of 0.9999', () => {
      expect(getDurationFormatter(987654, 0.9999)(987654).formatted).toEqual(
        '988 ms'
      );
      expect(getDurationFormatter(1000000, 0.9999)(1000000).formatted).toEqual(
        '1 s'
      );
      expect(getDurationFormatter(1234567, 0.9999)(1234567).formatted).toEqual(
        '1 s'
      );
      expect(getDurationFormatter(9876543, 0.9999)(9876543).formatted).toEqual(
        '10 s'
      );
      expect(
        getDurationFormatter(10000000, 0.9999)(10000000).formatted
      ).toEqual('10 s');
      expect(
        getDurationFormatter(12345678, 0.9999)(12345678).formatted
      ).toEqual('12 s');
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
});
