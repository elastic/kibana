/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeRange } from './get_time_range';

describe('getTimeRange', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-10-04T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns time range with no query delay', () => {
    const { dateStart, dateEnd } = getTimeRange('5m', { delay: 0 });
    expect(dateStart).toBe('2023-10-03T23:55:00.000Z');
    expect(dateEnd).toBe('2023-10-04T00:00:00.000Z');
  });

  test('returns time range with a query delay', () => {
    const { dateStart, dateEnd } = getTimeRange('5m', { delay: 45 });
    expect(dateStart).toBe('2023-10-03T23:54:15.000Z');
    expect(dateEnd).toBe('2023-10-03T23:59:15.000Z');
  });

  test('throws an error when the time window is invalid', () => {
    expect(() => getTimeRange('5k', { delay: 45 })).toThrowErrorMatchingInlineSnapshot(
      `"Invalid format for windowSize: \\"5k\\""`
    );
  });
});
