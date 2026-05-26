/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns `end`, bumped to "now" when it's in the past, so the badges query
 * always covers currently-active alerts. `nowMs` is injectable for tests.
 */
export function getServiceMapBadgesEnd(end: string, nowMs: number = Date.now()): string {
  const endMs = new Date(end).getTime();
  if (Number.isNaN(endMs)) {
    return end;
  }
  return endMs >= nowMs ? end : new Date(nowMs).toISOString();
}
