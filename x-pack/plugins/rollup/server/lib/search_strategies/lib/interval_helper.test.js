/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { isCalendarInterval, leastCommonInterval } from './interval_helper';

describe('interval_helper', () => {
  describe('interval_helper', () => {
    test('should return true for mixed intervals and value === 1', () => {
      expect(isCalendarInterval({ value: 1, unit: 'm' })).toBeTruthy();
      expect(isCalendarInterval({ value: 1, unit: 'h' })).toBeTruthy();
      expect(isCalendarInterval({ value: 1, unit: 'd' })).toBeTruthy();
    });

    test('should return false for mixed intervals and value !== 1', () => {
      expect(isCalendarInterval({ value: 2, unit: 'm' })).toBeFalsy();
      expect(isCalendarInterval({ value: 3, unit: 'h' })).toBeFalsy();
      expect(isCalendarInterval({ value: 4, unit: 'd' })).toBeFalsy();
    });

    test('should return false for fixed intervals', () => {
      expect(isCalendarInterval({ value: 3, unit: 'ms' })).toBeFalsy();
      expect(isCalendarInterval({ value: 1, unit: 's' })).toBeFalsy();
      expect(isCalendarInterval({ value: 3, unit: 's' })).toBeFalsy();
    });

    test('should return true for calendar intervals and value === 1', () => {
      expect(isCalendarInterval({ value: 1, unit: 'w' })).toBeTruthy();
      expect(isCalendarInterval({ value: 1, unit: 'M' })).toBeTruthy();
      expect(isCalendarInterval({ value: 1, unit: 'y' })).toBeTruthy();
    });

    test('should return false for calendar intervals and value !== 1', () => {
      expect(isCalendarInterval({ value: 2, unit: 'w' })).toBeFalsy();
      expect(isCalendarInterval({ value: 3, unit: 'M' })).toBeFalsy();
      expect(isCalendarInterval({ value: 4, unit: 'y' })).toBeFalsy();
    });
  });

  describe('leastCommonInterval', () => {
    test('should return least common interval (positive tests)', () => {
      expect(leastCommonInterval(0, 1)).toBe(1);
      expect(leastCommonInterval(1, 3)).toBe(3);
      expect(leastCommonInterval(12, 5)).toBe(15);
      expect(leastCommonInterval(4, 7)).toBe(7);
    });

    test('should not return least common interval (negative tests)', () => {
      expect(leastCommonInterval(0, 0)).toBeNaN();
    });
  });
});
