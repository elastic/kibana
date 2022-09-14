/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCounts, periodToMs } from './current_status';

jest.mock('../util', () => ({
  getMonitors: jest.fn().mockReturnValue({
    per_page: 10,
    saved_objects: [
      {
        id: 'mon-1',
        attributes: {
          enabled: false,
          locations: ['us-east1', 'us-west1', 'japan'],
        },
      },
      {
        id: 'mon-2',
        attributes: {
          enabled: true,
          locations: ['us-east1', 'us-west1', 'japan'],
          schedule: {
            number: '10',
            unit: 'm',
          },
        },
      },
    ],
  }),
}));

jest.mock('../../legacy_uptime/lib/requests/get_snapshot_counts', () => ({
  getSnapshotCount: jest.fn().mockReturnValue({
    up: 2,
    down: 1,
    total: 3,
  }),
}));

describe('current status route', () => {
  describe('periodToMs', () => {
    it('returns 0 for unsupported unit type', () => {
      // @ts-expect-error passing invalid unit type for testing purpose
      expect(periodToMs({ number: '10', unit: 'rad' })).toEqual(0);
    });
    it('converts seconds', () => {
      expect(periodToMs({ number: '10', unit: 's' })).toEqual(10_000);
    });
    it('converts minutes', () => {
      expect(periodToMs({ number: '1', unit: 'm' })).toEqual(60_000);
    });
    it('converts hours', () => {
      expect(periodToMs({ number: '1', unit: 'h' })).toEqual(3_600_000);
    });
  });

  describe('getCounts', () => {
    it('parses responses and returns id and count data', async () => {
      // @ts-expect-error mock implementation for test purposes
      expect(await getCounts(jest.fn(), jest.fn(), jest.fn())).toEqual({
        disabledCount: 3,
        disabledIds: ['mon-1'],
        enabledIds: ['mon-2'],
        snapshot: {
          down: 1,
          total: 3,
          up: 2,
        },
      });
    });
  });
});
