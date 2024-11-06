/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRawDataOrDefault,
  isRawDataValid,
  MAX_SIZE,
  MIN_SIZE,
  sizeIsOutOfRange,
} from './helpers';

describe('helpers', () => {
  describe('isRawDataValid', () => {
    it('returns true for valid raw data', () => {
      const rawData = {
        field1: [1, 2, 3], // the Fields API may return a number array
        field2: ['a', 'b', 'c'], // the Fields API may return a string array
      };

      expect(isRawDataValid(rawData)).toBe(true);
    });

    it('returns true when a field array is empty', () => {
      const rawData = {
        field1: [1, 2, 3], // the Fields API may return a number array
        field2: ['a', 'b', 'c'], // the Fields API may return a string array
        field3: [], // the Fields API may return an empty array
      };

      expect(isRawDataValid(rawData)).toBe(true);
    });

    it('returns false when a field does not have an array of values', () => {
      const rawData = {
        field1: [1, 2, 3],
        field2: 'invalid',
      };

      expect(isRawDataValid(rawData)).toBe(false);
    });

    it('returns true for empty raw data', () => {
      const rawData = {};

      expect(isRawDataValid(rawData)).toBe(true);
    });

    it('returns false when raw data is an unexpected type', () => {
      const rawData = 1234;

      // @ts-expect-error
      expect(isRawDataValid(rawData)).toBe(false);
    });
  });

  describe('getRawDataOrDefault', () => {
    it('returns the raw data when it is valid', () => {
      const rawData = {
        field1: [1, 2, 3],
        field2: ['a', 'b', 'c'],
      };

      expect(getRawDataOrDefault(rawData)).toEqual(rawData);
    });

    it('returns an empty object when the raw data is invalid', () => {
      const rawData = {
        field1: [1, 2, 3],
        field2: 'invalid',
      };

      expect(getRawDataOrDefault(rawData)).toEqual({});
    });
  });

  describe('sizeIsOutOfRange', () => {
    it('returns true when size is undefined', () => {
      const size = undefined;

      expect(sizeIsOutOfRange(size)).toBe(true);
    });

    it('returns true when size is less than MIN_SIZE', () => {
      const size = MIN_SIZE - 1;

      expect(sizeIsOutOfRange(size)).toBe(true);
    });

    it('returns true when size is greater than MAX_SIZE', () => {
      const size = MAX_SIZE + 1;

      expect(sizeIsOutOfRange(size)).toBe(true);
    });

    it('returns false when size is exactly MIN_SIZE', () => {
      const size = MIN_SIZE;

      expect(sizeIsOutOfRange(size)).toBe(false);
    });

    it('returns false when size is exactly MAX_SIZE', () => {
      const size = MAX_SIZE;

      expect(sizeIsOutOfRange(size)).toBe(false);
    });

    it('returns false when size is within the valid range', () => {
      const size = MIN_SIZE + 1;

      expect(sizeIsOutOfRange(size)).toBe(false);
    });
  });
});
