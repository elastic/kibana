/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Daily run quotas reset at UTC midnight. */
export const DEFAULT_RUN_QUOTA_TIME_ZONE = 'UTC';

export const MIN_RUN_LIMIT = 0;
export const MAX_RUN_LIMIT = 10_000;

export interface RunQuotaWindow {
  start: string;
  resetsAt: string;
  timezone: typeof DEFAULT_RUN_QUOTA_TIME_ZONE;
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const resolveDailyWindow = (now: Date = new Date()): RunQuotaWindow => {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return {
    start: start.toISOString(),
    resetsAt: new Date(start.getTime() + MILLISECONDS_PER_DAY).toISOString(),
    timezone: DEFAULT_RUN_QUOTA_TIME_ZONE,
  };
};

export const dayKey = (window: RunQuotaWindow): string => window.start.slice(0, 10);
