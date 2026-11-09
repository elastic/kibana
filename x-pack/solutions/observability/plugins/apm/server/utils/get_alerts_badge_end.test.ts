/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsBadgeEndMs } from './get_alerts_badge_end';

const NOW_MS = Date.parse('2026-05-12T13:00:00.000Z');

describe('getAlertsBadgeEndMs', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_MS);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the user-selected end when it is already at "now"', () => {
    expect(getAlertsBadgeEndMs(NOW_MS, NOW_MS)).toBe(NOW_MS);
  });

  it('returns the user-selected end when it is in the future relative to now', () => {
    const future = NOW_MS + 30 * 60 * 1000;
    expect(getAlertsBadgeEndMs(future, NOW_MS)).toBe(future);
  });

  it('extends a past end to "now" so currently-active alerts are not missed', () => {
    const past = Date.parse('2026-05-12T10:11:52.119Z');
    expect(getAlertsBadgeEndMs(past, NOW_MS)).toBe(NOW_MS);
  });

  it('returns non-finite values unchanged', () => {
    expect(getAlertsBadgeEndMs(Number.NaN, NOW_MS)).toBeNaN();
  });

  it('uses Date.now() when no explicit clock is provided', () => {
    const past = NOW_MS - 60_000;
    expect(getAlertsBadgeEndMs(past)).toBe(NOW_MS);
  });
});
