/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asDecimal, asInteger, asPercent, asDecimalOrInteger } from './formatters';

describe('formatters', () => {
  describe('asDecimal', () => {
    it('displays the not available label when the number is not finite', () => {
      expect(asDecimal(Infinity)).toBe('N/A');
      expect(asDecimal(-Infinity)).toBe('N/A');
      expect(asDecimal(null)).toBe('N/A');
      expect(asDecimal(undefined)).toBe('N/A');
    });

    it('displays the correct label when the number is finite', () => {
      expect(asDecimal(0)).toBe('0.0');
      expect(asDecimal(0.005)).toBe('0.0');
      expect(asDecimal(1.23)).toBe('1.2');
      expect(asDecimal(12.34)).toBe('12.3');
      expect(asDecimal(123.45)).toBe('123.5');
      expect(asDecimal(1234.56)).toBe('1,234.6');
    });
  });

  describe('asInteger', () => {
    it('displays the not available label when the number is not finite', () => {
      expect(asInteger(Infinity)).toBe('N/A');
      expect(asInteger(-Infinity)).toBe('N/A');
      expect(asInteger(null)).toBe('N/A');
      expect(asInteger(undefined)).toBe('N/A');
    });

    it('displays the correct label when the number is finite', () => {
      expect(asInteger(0)).toBe('0');
      expect(asInteger(0.005)).toBe('0');
      expect(asInteger(1.23)).toBe('1');
      expect(asInteger(12.34)).toBe('12');
      expect(asInteger(123.45)).toBe('123');
      expect(asInteger(1234.56)).toBe('1,235');
    });
  });

  describe('asPercent', () => {
    it('formats as integer when number is above 10', () => {
      expect(asPercent(3725, 10000, 'n/a')).toEqual('37%');
    });

    it('adds a decimal when value is below 10', () => {
      expect(asPercent(0.092, 1)).toEqual('9.2%');
    });

    it('formats when numerator is 0', () => {
      expect(asPercent(0, 1, 'n/a')).toEqual('0%');
    });

    it('returns fallback when denominator is undefined', () => {
      expect(asPercent(3725, undefined, 'n/a')).toEqual('n/a');
    });

    it('returns fallback when denominator is 0 ', () => {
      expect(asPercent(3725, 0, 'n/a')).toEqual('n/a');
    });

    it('returns fallback when numerator or denominator is NaN', () => {
      expect(asPercent(3725, NaN, 'n/a')).toEqual('n/a');
      expect(asPercent(NaN, 10000, 'n/a')).toEqual('n/a');
    });
  });

  describe('asDecimalOrInteger', () => {
    it('formats as integer when number equals to 0 ', () => {
      expect(asDecimalOrInteger(0)).toEqual('0');
    });
    it('formats as integer when number is above or equals 10 ', () => {
      expect(asDecimalOrInteger(10.123)).toEqual('10');
      expect(asDecimalOrInteger(15.123)).toEqual('15');
    });
    it('formats as decimal when number is below 10 ', () => {
      expect(asDecimalOrInteger(0.25435632645)).toEqual('0.3');
      expect(asDecimalOrInteger(1)).toEqual('1.0');
      expect(asDecimalOrInteger(3.374329704990765)).toEqual('3.4');
      expect(asDecimalOrInteger(5)).toEqual('5.0');
      expect(asDecimalOrInteger(9)).toEqual('9.0');
    });
  });
});
