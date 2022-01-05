/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asDuration, asTransactionRate, toMicroseconds, asMillisecondDuration } from './duration';

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

  describe('asTransactionRate', () => {
    it.each([
      [Infinity, 'N/A'],
      [-Infinity, 'N/A'],
      [null, 'N/A'],
      [undefined, 'N/A'],
      [NaN, 'N/A'],
    ])(
      'displays the not available label when the number is not finite',
      (value, formattedValue) => {
        expect(asTransactionRate(value)).toBe(formattedValue);
      }
    );

    it.each([
      [0, '0 tpm'],
      [0.005, '< 0.1 tpm'],
    ])(
      'displays the correct label when the number is positive and less than 1',
      (value, formattedValue) => {
        expect(asTransactionRate(value)).toBe(formattedValue);
      }
    );

    it.each([
      [1, '1.0 tpm'],
      [10, '10.0 tpm'],
      [100, '100.0 tpm'],
      [1000, '1,000.0 tpm'],
      [1000000, '1,000,000.0 tpm'],
    ])(
      'displays the correct label when the number is integer and has zero decimals',
      (value, formattedValue) => {
        expect(asTransactionRate(value)).toBe(formattedValue);
      }
    );

    it.each([
      [1.23, '1.2 tpm'],
      [12.34, '12.3 tpm'],
      [123.45, '123.5 tpm'],
      [1234.56, '1,234.6 tpm'],
      [1234567.89, '1,234,567.9 tpm'],
    ])(
      'displays the correct label when the number is positive and has decimal part',
      (value, formattedValue) => {
        expect(asTransactionRate(value)).toBe(formattedValue);
      }
    );
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
