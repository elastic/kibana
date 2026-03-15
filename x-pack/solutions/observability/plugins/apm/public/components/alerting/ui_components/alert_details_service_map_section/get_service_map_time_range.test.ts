/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceMapTimeRange } from './get_service_map_time_range';

describe('getServiceMapTimeRange', () => {
  it('returns 5 min before start through alert end when duration is under 15 minutes', () => {
    const alertStart = '2024-01-15T13:00:00.000Z';
    const alertEnd = '2024-01-15T13:05:00.000Z';
    const result = getServiceMapTimeRange(alertStart, alertEnd);
    expect(result.from).toBe('2024-01-15T12:55:00.000Z');
    expect(result.to).toBe(alertEnd);
  });

  it('returns 5 min before and 10 min after start when alert duration is over 15 minutes', () => {
    const alertStart = '2024-01-15T13:00:00.000Z';
    const alertEnd = '2024-01-15T14:00:00.000Z'; // 1 hour later
    const result = getServiceMapTimeRange(alertStart, alertEnd);
    expect(result.from).toBe('2024-01-15T12:55:00.000Z');
    expect(result.to).toBe('2024-01-15T13:10:00.000Z');
  });

  it('returns 5 min before start through alert end when duration is exactly 15 minutes', () => {
    const alertStart = '2024-01-15T13:00:00.000Z';
    const alertEnd = '2024-01-15T13:15:00.000Z';
    const result = getServiceMapTimeRange(alertStart, alertEnd);
    expect(result.from).toBe('2024-01-15T12:55:00.000Z');
    expect(result.to).toBe(alertEnd);
  });

  it('returns 5 min before and 10 min after start for a multi-hour alert', () => {
    const alertStart = '2024-01-15T13:00:00.000Z';
    const alertEnd = '2024-01-15T17:30:00.000Z';
    const result = getServiceMapTimeRange(alertStart, alertEnd);
    expect(result.from).toBe('2024-01-15T12:55:00.000Z');
    expect(result.to).toBe('2024-01-15T13:10:00.000Z');
  });

  it('uses start + 10 min when alert end is missing (active alert)', () => {
    const alertStart = '2024-01-15T13:00:00.000Z';
    const result = getServiceMapTimeRange(alertStart);
    expect(result.from).toBe('2024-01-15T12:55:00.000Z');
    expect(result.to).toBe('2024-01-15T13:10:00.000Z');
  });
});
