/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsBadgeEnd, getAlertsBadgeEndMs } from './get_alerts_badge_end';

const NOW_ISO = '2026-05-12T13:00:00.000Z';
const NOW_MS = new Date(NOW_ISO).getTime();

describe('getAlertsBadgeEndMs', () => {
  it('returns the user-selected end when it is already at "now"', () => {
    expect(getAlertsBadgeEndMs(NOW_MS, NOW_MS)).toBe(NOW_MS);
  });

  it('returns the user-selected end when it is in the future relative to now', () => {
    const future = NOW_MS + 30 * 60 * 1000;
    expect(getAlertsBadgeEndMs(future, NOW_MS)).toBe(future);
  });

  it('extends a past end to "now" so currently-active alerts are not missed', () => {
    const past = new Date('2026-05-12T10:11:52.119Z').getTime();
    expect(getAlertsBadgeEndMs(past, NOW_MS)).toBe(NOW_MS);
  });

  it('returns non-finite values unchanged', () => {
    expect(getAlertsBadgeEndMs(Number.NaN, NOW_MS)).toBeNaN();
  });

  it('uses Date.now() when no explicit clock is provided', () => {
    const realDateNow = Date.now;
    Date.now = jest.fn(() => NOW_MS);
    try {
      const past = NOW_MS - 60_000;
      expect(getAlertsBadgeEndMs(past)).toBe(NOW_MS);
    } finally {
      Date.now = realDateNow;
    }
  });
});

describe('getAlertsBadgeEnd', () => {
  it('returns the user-selected end when it is already at "now"', () => {
    expect(getAlertsBadgeEnd(NOW_ISO, NOW_MS)).toBe(NOW_ISO);
  });

  it('returns the user-selected end when it is in the future relative to now', () => {
    const future = '2026-05-12T13:30:00.000Z';
    expect(getAlertsBadgeEnd(future, NOW_MS)).toBe(future);
  });

  it('extends a past end to "now" so currently-active alerts are not missed', () => {
    const past = '2026-05-12T10:11:52.119Z';
    expect(getAlertsBadgeEnd(past, NOW_MS)).toBe(NOW_ISO);
  });

  it('falls back to the original value when the input cannot be parsed', () => {
    expect(getAlertsBadgeEnd('not-a-date', NOW_MS)).toBe('not-a-date');
  });

  it('uses Date.now() when no explicit clock is provided', () => {
    const realDateNow = Date.now;
    Date.now = jest.fn(() => NOW_MS);
    try {
      const past = '2026-05-12T10:00:00.000Z';
      expect(getAlertsBadgeEnd(past)).toBe(NOW_ISO);
    } finally {
      Date.now = realDateNow;
    }
  });
});
