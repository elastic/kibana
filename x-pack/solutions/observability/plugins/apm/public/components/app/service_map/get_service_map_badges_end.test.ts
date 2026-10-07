/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceMapBadgesEnd } from './get_service_map_badges_end';

const NOW_ISO = '2026-05-12T13:00:00.000Z';
const NOW_MS = new Date(NOW_ISO).getTime();

describe('getServiceMapBadgesEnd', () => {
  it('returns the user-selected end when it is already at "now"', () => {
    expect(getServiceMapBadgesEnd(NOW_ISO, NOW_MS)).toBe(NOW_ISO);
  });

  it('returns the user-selected end when it is in the future relative to now', () => {
    const future = '2026-05-12T13:30:00.000Z';
    expect(getServiceMapBadgesEnd(future, NOW_MS)).toBe(future);
  });

  it('extends a past end to "now" so currently-active alerts are not missed', () => {
    const past = '2026-05-12T10:11:52.119Z';
    expect(getServiceMapBadgesEnd(past, NOW_MS)).toBe(NOW_ISO);
  });

  it('does not extend an end that ends at exactly now', () => {
    expect(getServiceMapBadgesEnd(NOW_ISO, NOW_MS)).toBe(NOW_ISO);
  });

  it('falls back to the original value when the input cannot be parsed', () => {
    expect(getServiceMapBadgesEnd('not-a-date', NOW_MS)).toBe('not-a-date');
  });

  it('uses Date.now() when no explicit clock is provided', () => {
    const realDateNow = Date.now;
    Date.now = jest.fn(() => NOW_MS);
    try {
      const past = '2026-05-12T10:00:00.000Z';
      expect(getServiceMapBadgesEnd(past)).toBe(NOW_ISO);
    } finally {
      Date.now = realDateNow;
    }
  });
});
