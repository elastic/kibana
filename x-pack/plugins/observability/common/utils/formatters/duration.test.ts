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
    it('displays the not available label when the number is not finite', () => {
      expect(asTransactionRate(Infinity)).toBe('N/A');
      expect(asTransactionRate(-Infinity)).toBe('N/A');
      expect(asTransactionRate(null)).toBe('N/A');
      expect(asTransactionRate(undefined)).toBe('N/A');
    });

    it('displays the correct label when the number is finite', () => {
      expect(asTransactionRate(0)).toBe('0 tpm');
      expect(asTransactionRate(0.005)).toBe('< 0.1 tpm');
      // Integer numbers get zero decimals
      expect(asTransactionRate(1)).toBe('1.0 tpm');
      expect(asTransactionRate(10)).toBe('10.0 tpm');
      expect(asTransactionRate(100)).toBe('100.0 tpm');
      expect(asTransactionRate(1000)).toBe('1,000.0 tpm');
      // Decimal numbers are correctly rounded
      expect(asTransactionRate(1.23)).toBe('1.2 tpm');
      expect(asTransactionRate(12.34)).toBe('12.3 tpm');
      expect(asTransactionRate(123.45)).toBe('123.5 tpm');
      expect(asTransactionRate(1234.56)).toBe('1,234.6 tpm');
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
