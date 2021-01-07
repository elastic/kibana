/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { asPercent, asDecimalOrInteger } from './formatters';

describe('formatters', () => {
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
