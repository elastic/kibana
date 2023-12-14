/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  calcAutoIntervalNear,
  isAbsoluteTimeShift,
  parseAbsoluteTimeShift,
  parseTimeShift,
} from '@kbn/data-plugin/common';
import moment from 'moment';
import { DateRange } from '../../types';

export function parseTimeShiftWrapper(timeShiftString: string, dateRange: DateRange) {
  if (isAbsoluteTimeShift(timeShiftString.trim())) {
    return parseAbsoluteTimeShift(timeShiftString, {
      from: dateRange.fromDate,
      to: dateRange.toDate,
    }).value;
  }
  return parseTimeShift(timeShiftString);
}

function closestMultipleOfInterval(duration: number, interval: number) {
  if (duration % interval === 0) {
    return duration;
  }
  return Math.ceil(duration / interval) * interval;
}

function roundAbsoluteInterval(timeShift: string, dateRange: DateRange, targetBars: number) {
  // workout the interval (most probably matching the ES one)
  const interval = calcAutoIntervalNear(
    targetBars,
    moment(dateRange.toDate).diff(moment(dateRange.fromDate))
  );
  const duration = parseTimeShiftWrapper(timeShift, dateRange);
  if (typeof duration !== 'string') {
    const roundingOffset = timeShift.startsWith('end') ? interval.asMilliseconds() : 0;
    return `${
      (closestMultipleOfInterval(duration.asMilliseconds(), interval.asMilliseconds()) -
        roundingOffset) /
      1000
    }s`;
  }
}

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
