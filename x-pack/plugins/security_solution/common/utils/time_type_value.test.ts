/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeTypeValue } from './time_type_value';

describe('getTimeTypeValue', () => {
  [
    { interval: '1ms', value: 1, unit: 'ms' },
    { interval: '0s', value: 0, unit: 's' },
    { interval: '3s', value: 3, unit: 's' },
    { interval: '5m', value: 5, unit: 'm' },
    { interval: '7h', value: 7, unit: 'h' },
    { interval: '10d', value: 10, unit: 'd' },
  ].forEach(({ interval, value, unit }) => {
    it(`should correctly return time duration and time unit when 'interval' is ${interval}`, () => {
      const { value: actualValue, unit: actualUnit } = getTimeTypeValue(interval);
      expect(actualValue).toBe(value);
      expect(actualUnit).toBe(unit);
    });
  });

  [
    { interval: '-1ms', value: 1, unit: 'ms' },
    { interval: '-3s', value: 3, unit: 's' },
    { interval: '-5m', value: 5, unit: 'm' },
    { interval: '-7h', value: 7, unit: 'h' },
    { interval: '-10d', value: 10, unit: 'd' },
    { interval: '-1', value: 1, unit: 'ms' },
    { interval: '-3', value: 3, unit: 'ms' },
    { interval: '-5', value: 5, unit: 'ms' },
    { interval: '-7', value: 7, unit: 'ms' },
    { interval: '-10', value: 10, unit: 'ms' },
  ].forEach(({ interval, value, unit }) => {
    it(`should correctly return positive time duration and time unit when 'interval' is negative (${interval})`, () => {
      const { value: actualValue, unit: actualUnit } = getTimeTypeValue(interval);
      expect(actualValue).toBe(value);
      expect(actualUnit).toBe(unit);
    });
  });

  [
    { interval: 'ms', value: 0, unit: 'ms' },
    { interval: 's', value: 0, unit: 's' },
    { interval: 'm', value: 0, unit: 'm' },
    { interval: 'h', value: 0, unit: 'h' },
    { interval: 'd', value: 0, unit: 'd' },
    { interval: '-ms', value: 0, unit: 'ms' },
    { interval: '-s', value: 0, unit: 's' },
    { interval: '-m', value: 0, unit: 'm' },
    { interval: '-h', value: 0, unit: 'h' },
    { interval: '-d', value: 0, unit: 'd' },
  ].forEach(({ interval, value, unit }) => {
    it(`should correctly return time duration equal to '0' when 'interval' does not specify time duration (${interval})`, () => {
      const { value: actualValue, unit: actualUnit } = getTimeTypeValue(interval);
      expect(actualValue).toBe(value);
      expect(actualUnit).toBe(unit);
    });
  });

  [
    { interval: '0', value: 0, unit: 'ms' },
    { interval: '1', value: 1, unit: 'ms' },
    { interval: '3', value: 3, unit: 'ms' },
    { interval: '5', value: 5, unit: 'ms' },
    { interval: '7', value: 7, unit: 'ms' },
    { interval: '10', value: 10, unit: 'ms' },
  ].forEach(({ interval, value, unit }) => {
    it(`should correctly return time unit set to 'ms' as a default value when 'interval' does not specify it (${interval})`, () => {
      const { value: actualValue, unit: actualUnit } = getTimeTypeValue(interval);
      expect(actualValue).toBe(value);
      expect(actualUnit).toBe(unit);
    });
  });

  [
    { interval: '1f', value: 1, unit: 'ms' },
    { interval: '-3r', value: 3, unit: 'ms' },
    { interval: 'p', value: 0, unit: 'ms' },
  ].forEach(({ interval, value, unit }) => {
    it(`should correctly return time unit set to 'ms' as a default value when data is invalid (${interval})`, () => {
      const { value: actualValue, unit: actualUnit } = getTimeTypeValue(interval);
      expect(actualValue).toBe(value);
      expect(actualUnit).toBe(unit);
    });
  });
});
