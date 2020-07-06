/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTimeInterval, createTimeInterval, isValidTimeInterval } from '../time_interval';

describe('time_interval', () => {
  test('getTimeInterval', () => {
    expect(getTimeInterval('2s')).toBe(2000);
    expect(getTimeInterval('4s')).toBe(4000);
    expect(getTimeInterval('1m')).toBe(60000);
    expect(getTimeInterval('5m')).toBe(300000);
    expect(getTimeInterval('15m')).toBe(900000);
    expect(getTimeInterval('30m')).toBe(1800000);
    expect(getTimeInterval('1h')).toBe(3600000);
    expect(getTimeInterval('2h')).toBe(7200000);
    expect(getTimeInterval('6h')).toBe(21600000);
    expect(getTimeInterval('12h')).toBe(43200000);
    expect(getTimeInterval('1d')).toBe(86400000);
  });
  test('createTimeInterval', () => {
    expect(createTimeInterval(2000)).toBe('2s');
    expect(createTimeInterval(4000)).toBe('4s');
    expect(createTimeInterval(300000)).toBe('5m');
    expect(createTimeInterval(900000)).toBe('15m');
    expect(createTimeInterval(1800000)).toBe('30m');
    expect(createTimeInterval(3600000)).toBe('1h');
    expect(createTimeInterval(7200000)).toBe('2h');
    expect(createTimeInterval(21600000)).toBe('6h');
    expect(createTimeInterval(43200000)).toBe('12h');
    expect(createTimeInterval(86400000)).toBe('1d');
  });
  test('isValidTimeInterval', () => {
    expect(isValidTimeInterval('2s')).toBe(true);
    expect(isValidTimeInterval('2m')).toBe(true);
    expect(isValidTimeInterval('2h')).toBe(true);
    expect(isValidTimeInterval('2d')).toBe(true);
    expect(isValidTimeInterval('2f')).toBe(false);
    expect(isValidTimeInterval('no')).toBe(false);
  });
});
