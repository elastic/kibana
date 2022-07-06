/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { TimeRange } from './types';

export function buildTimeRange(start: string, end: string): TimeRange {
  const timeStart = datemath.parse(start)!;
  const timeEnd = datemath.parse(end)!;
  return {
    start,
    end,
    isoStart: timeStart.toISOString(),
    isoEnd: timeEnd.toISOString(),
    unixStart: timeStart.utc().unix(),
    unixEnd: timeEnd.utc().unix(),
  };
}
