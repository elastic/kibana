/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceMapTimeRange } from './get_service_map_time_range';

describe('getServiceMapTimeRange', () => {
  it('returns full range when alert duration is under 15 minutes', () => {
    const from = '2024-01-15T13:00:00.000Z';
    const to = '2024-01-15T13:05:00.000Z';
    const result = getServiceMapTimeRange(from, to);
    expect(result.from).toBe(from);
    expect(result.to).toBe(to);
  });

  it('returns first 15 minutes when alert duration is over 15 minutes', () => {
    const from = '2024-01-15T13:00:00.000Z';
    const to = '2024-01-15T14:00:00.000Z'; // 1 hour later
    const result = getServiceMapTimeRange(from, to);
    expect(result.from).toBe(from);
    expect(result.to).toBe('2024-01-15T13:15:00.000Z');
  });

  it('returns full range when alert duration is exactly 15 minutes', () => {
    const from = '2024-01-15T13:00:00.000Z';
    const to = '2024-01-15T13:15:00.000Z';
    const result = getServiceMapTimeRange(from, to);
    expect(result.from).toBe(from);
    expect(result.to).toBe(to);
  });

  it('caps at 15 minutes for a multi-hour alert', () => {
    const from = '2024-01-15T13:00:00.000Z';
    const to = '2024-01-15T17:30:00.000Z';
    const result = getServiceMapTimeRange(from, to);
    expect(result.from).toBe(from);
    expect(result.to).toBe('2024-01-15T13:15:00.000Z');
  });
});
