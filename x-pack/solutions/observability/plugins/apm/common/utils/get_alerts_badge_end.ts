/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns `endMs` bumped to "now" when it's in the past, so badge queries
 * always cover currently-active alerts. `nowMs` is injectable for tests.
 */
export function getAlertsBadgeEndMs(endMs: number, nowMs: number = Date.now()): number {
  if (!Number.isFinite(endMs)) {
    return endMs;
  }
  return endMs >= nowMs ? endMs : nowMs;
}

/**
 * ISO-string variant of {@link getAlertsBadgeEndMs} for client time-range values.
 */
export function getAlertsBadgeEnd(end: string, nowMs: number = Date.now()): string {
  const endMs = new Date(end).getTime();
  if (Number.isNaN(endMs)) {
    return end;
  }
  const badgesEndMs = getAlertsBadgeEndMs(endMs, nowMs);
  return badgesEndMs === endMs ? end : new Date(badgesEndMs).toISOString();
}
