/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Extends a user-selected time range's `end` so the alert/SLO badges query on
 * the service map always includes "now". Active-alert documents are written on
 * the rule's evaluation cadence — their `@timestamp` tends to sit very close to
 * "now", so a window ending in the past would miss them and a currently-active
 * alert would never light up on the map.
 *
 * The graph (topology) query keeps the user's exact range; only badges widen.
 *
 * @param end       User-selected end timestamp (ISO string).
 * @param nowMs     Pinnable clock; defaults to `Date.now()` so tests can hold it.
 * @returns ISO string — `end` when it's already ≥ now, otherwise the current time.
 */
export function getServiceMapBadgesEnd(end: string, nowMs: number = Date.now()): string {
  const endMs = new Date(end).getTime();
  if (Number.isNaN(endMs)) {
    return end;
  }
  return endMs >= nowMs ? end : new Date(nowMs).toISOString();
}
