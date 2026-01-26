/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { RollupInterval } from '../../../common/rollup';

/**
 * Returns the appropriate rollup interval based on the time range.
 * Longer time ranges can tolerate more data delay in exchange for faster queries.
 * - Time range > 3 days: use 60m rollup (data delayed up to 60 min)
 * - Time range > 12 hours: use 10m rollup (data delayed up to 10 min)
 * - Otherwise: use 1m rollup (data delayed up to 1 min)
 */
export function getRollupIntervalForTimeRange(startMs: number, endMs: number): RollupInterval {
  const duration = moment.duration(endMs - startMs);

  if (duration.asDays() > 3) {
    return RollupInterval.SixtyMinutes;
  }
  if (duration.asHours() > 12) {
    return RollupInterval.TenMinutes;
  }
  return RollupInterval.OneMinute;
}
