/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceMapTimeRange } from './get_service_map_time_range';

describe('getServiceMapTimeRange', () => {
  const NOW = new Date('2024-01-15T13:50:00.000Z').valueOf();
  const NOW_ISO = new Date(NOW).toISOString();

  describe('graph range (focused, cost-bounded)', () => {
    it('uses 5 min before through alert end for short recovered alerts (≤ 30 min)', () => {
      const result = getServiceMapTimeRange(
        '2024-01-15T13:00:00.000Z',
        '2024-01-15T13:05:00.000Z',
        NOW
      );
      expect(result.graph.from).toBe('2024-01-15T12:55:00.000Z');
      expect(result.graph.to).toBe('2024-01-15T13:05:00.000Z');
    });

    it('uses alert end when duration is exactly 30 minutes (no cap yet)', () => {
      const result = getServiceMapTimeRange(
        '2024-01-15T13:00:00.000Z',
        '2024-01-15T13:30:00.000Z',
        NOW
      );
      expect(result.graph.to).toBe('2024-01-15T13:30:00.000Z');
    });

    it('caps at start + 30 min for recovered alerts longer than 30 min', () => {
      const result = getServiceMapTimeRange(
        '2024-01-15T13:00:00.000Z',
        '2024-01-15T14:00:00.000Z',
        NOW
      );
      expect(result.graph.to).toBe('2024-01-15T13:30:00.000Z');
    });

    it('caps at start + 30 min for active alerts older than 30 min', () => {
      const result = getServiceMapTimeRange(
        '2024-01-15T10:00:00.000Z', // ~3h45m before NOW
        undefined,
        NOW
      );
      expect(result.graph.from).toBe('2024-01-15T09:55:00.000Z');
      expect(result.graph.to).toBe('2024-01-15T10:30:00.000Z');
    });

    it('uses `now` for fresh active alerts (younger than 30 min)', () => {
      const result = getServiceMapTimeRange(
        '2024-01-15T13:40:00.000Z', // 10 min before NOW
        undefined,
        NOW
      );
      expect(result.graph.to).toBe(NOW_ISO);
    });
  });

  describe('badges range (full alert lifecycle)', () => {
    it('uses alert end as the upper bound for recovered alerts', () => {
      const result = getServiceMapTimeRange(
        '2024-01-15T13:00:00.000Z',
        '2024-01-15T13:05:00.000Z',
        NOW
      );
      expect(result.badges.from).toBe('2024-01-15T12:55:00.000Z');
      expect(result.badges.to).toBe('2024-01-15T13:05:00.000Z');
    });

    it('uses alert end (uncapped) even for very long recovered alerts', () => {
      const result = getServiceMapTimeRange(
        '2024-01-15T13:00:00.000Z',
        '2024-01-15T17:30:00.000Z',
        NOW
      );
      expect(result.badges.to).toBe('2024-01-15T17:30:00.000Z');
    });

    it('uses `now` as the upper bound for active alerts, even when older than 30 min', () => {
      const result = getServiceMapTimeRange(
        '2024-01-15T10:00:00.000Z', // ~3h45m before NOW
        undefined,
        NOW
      );
      expect(result.badges.to).toBe(NOW_ISO);
    });
  });

  it('shares the same `from` for both ranges', () => {
    const result = getServiceMapTimeRange(
      '2024-01-15T13:00:00.000Z',
      '2024-01-15T14:00:00.000Z',
      NOW
    );
    expect(result.graph.from).toBe(result.badges.from);
  });
});
