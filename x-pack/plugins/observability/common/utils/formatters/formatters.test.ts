/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asDecimal, asInteger, asPercent, asDecimalOrInteger } from './formatters';

describe('formatters', () => {
  describe('asDecimal', () => {
    it.each([
      [Infinity, 'N/A'],
      [-Infinity, 'N/A'],
      [null, 'N/A'],
      [undefined, 'N/A'],
      [NaN, 'N/A'],
    ])(
      'displays the not available label when the number is not finite',
      (value, formattedValue) => {
        expect(asDecimal(value)).toBe(formattedValue);
      }
    );

    it.each([
      [0, '0.0'],
      [0.005, '0.0'],
      [1.23, '1.2'],
      [12.34, '12.3'],
      [123.45, '123.5'],
      [1234.56, '1,234.6'],
      [1234567.89, '1,234,567.9'],
    ])('displays the correct label when the number is finite', (value, formattedValue) => {
      expect(asDecimal(value)).toBe(formattedValue);
    });
  });

  describe('asInteger', () => {
    it.each([
      [Infinity, 'N/A'],
      [-Infinity, 'N/A'],
      [null, 'N/A'],
      [undefined, 'N/A'],
      [NaN, 'N/A'],
    ])(
      'displays the not available label when the number is not finite',
      (value, formattedValue) => {
        expect(asInteger(value)).toBe(formattedValue);
      }
    );

    it.each([
      [0, '0'],
      [0.005, '0'],
      [1.23, '1'],
      [12.34, '12'],
      [123.45, '123'],
      [1234.56, '1,235'],
      [1234567.89, '1,234,568'],
    ])('displays the correct label when the number is finite', (value, formattedValue) => {
      expect(asInteger(value)).toBe(formattedValue);
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

    it.each([
      [0.25435632645, '0.3'],
      [1, '1.0'],
      [3.374329704990765, '3.4'],
      [5, '5.0'],
      [9, '9.0'],
    ])('formats as decimal when number is below 10 ', (value, formattedValue) => {
      expect(asDecimalOrInteger(value)).toBe(formattedValue);
    });

    it.each([
      [-0.123, '-0.1'],
      [-1.234, '-1.2'],
      [-9.876, '-9.9'],
    ])(
      'formats as decimal when number is negative and below 10 in absolute value',
      (value, formattedValue) => {
        expect(asDecimalOrInteger(value)).toEqual(formattedValue);
      }
    );

    it.each([
      [-12.34, '-12'],
      [-123.45, '-123'],
      [-1234.56, '-1,235'],
      [-12345.67, '-12,346'],
      [-12345678.9, '-12,345,679'],
    ])(
      'formats as integer when number is negative and above or equals 10 in absolute value',
      (value, formattedValue) => {
        expect(asDecimalOrInteger(value)).toEqual(formattedValue);
      }
    );
  });
});
