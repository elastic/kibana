/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as useMonitorErrors from '../hooks/use_monitor_errors';
import { isErrorActive } from './errors_list';

describe('isErrorActive', () => {
  let isActiveSpy: jest.SpyInstance;
  beforeEach(() => {
    isActiveSpy = jest.spyOn(useMonitorErrors, 'isActiveState').mockReturnValue(true);
  });
  const item = {
    '@timestamp': '2023-05-04T00:00:00.000Z',
    timestamp: '2023-05-04T00:00:00.000Z',
    docId: 'SGIQ6IcBTfgfaiALCdZ8',
    error: { message: 'Encountered an error and made this unhelpful message.' },
    state: {
      duration_ms: '415801',
      checks: 8,
      ends: null,
      started_at: '2023-05-04T18:32:41.111671462Z',
      id: 'foo',
      up: 8,
      down: 0,
      status: 'up',
    },
    monitor: {
      id: 'foo',
      status: 'up',
      type: 'browser',
      check_group: 'f01850cc-eaaa-11ed-887d-caddd792d648',
      timespan: { gte: '2023-05-04T00:00:00.000Z', lt: '2023-05-04T01:00:00.000Z' },
    },
  };
  const lastErrorId = 'foo';
  const latestPingStatus = 'down';

  it('returns true if error is active', () => {
    const result = isErrorActive(item, lastErrorId, latestPingStatus);
    expect(result).toBe(true);
  });

  it('returns false if error is not active', () => {
    isActiveSpy.mockReturnValue(false);
    expect(
      isErrorActive(
        { ...item, '@timestamp': '2023-05-04T02:00:00.000Z' },
        lastErrorId,
        latestPingStatus
      )
    ).toBe(false);
  });

  it('returns false if `lastErrorId` does not match `item.state.id`', () => {
    expect(isErrorActive(item, 'bar', latestPingStatus)).toBe(false);
  });

  it('returns false if latestPingStatus is `up`', () => {
    expect(isErrorActive(item, lastErrorId, 'up')).toBe(false);
  });
});
