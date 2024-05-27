/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS,
  MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_MS,
} from '../constants';

export function validateBackfillSchedule(start: string, end?: string): string | void {
  try {
    const now = new Date().valueOf();

    const parsedStart = Date.parse(start);
    if (isNaN(parsedStart)) {
      return `Backfill start must be valid date`;
    }

    if (now - parsedStart > MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_MS) {
      return `Backfill cannot look back more than ${MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS} days`;
    }

    if (now < parsedStart) {
      return `Backfill cannot be scheduled for the future`;
    }

    if (end) {
      const parsedEnd = Date.parse(end);
      if (isNaN(parsedEnd)) {
        return `Backfill end must be valid date`;
      }
      const startMs = new Date(start).valueOf();
      const endMs = new Date(end).valueOf();
      if (endMs <= startMs) {
        return `Backfill end must be greater than backfill start`;
      }

      if (now < parsedEnd) {
        return `Backfill cannot be scheduled for the future`;
      }
    }
  } catch (err) {
    return `Error validating backfill schedule - ${err.message}`;
  }
}
