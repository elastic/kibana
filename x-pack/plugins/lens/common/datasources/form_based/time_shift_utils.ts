/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function resolveTimeShift(
  timeShift: string | undefined,
  dateRange: DateRange,
  targetBars: number,
  hasDateHistogram: boolean = false
) {
  if (timeShift && isAbsoluteTimeShift(timeShift)) {
    return roundAbsoluteInterval(timeShift, dateRange, targetBars);
  }
  // Translate a relative "previous" shift into an absolute endAt(<current range start timestamp>)
  if (timeShift && hasDateHistogram && timeShift === 'previous') {
    return roundAbsoluteInterval(`endAt(${dateRange.fromDate})`, dateRange, targetBars);
  }
  return timeShift;
}
