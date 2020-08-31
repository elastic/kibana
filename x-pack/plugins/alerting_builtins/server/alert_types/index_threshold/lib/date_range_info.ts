/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { times } from 'lodash';
import { parseDuration } from '../../../../../alerts/server';
import { MAX_INTERVALS } from '../index';

// dates as numbers are epoch millis
// dates as strings are ISO

export interface DateRange {
  from: string;
  to: string;
}

export interface DateRangeInfo {
  dateStart: string;
  dateEnd: string;
  dateRanges: DateRange[];
}

export interface GetDateRangeInfoParams {
  dateStart?: string;
  dateEnd?: string;
  interval?: string;
  window: string;
}

// Given a start and end date, an interval, and a window, calculate the
// array of date ranges, each date range is offset by it's peer by one interval,
// and each date range is window milliseconds long.
export function getDateRangeInfo(params: GetDateRangeInfoParams): DateRangeInfo {
  const { dateStart: dateStartS, dateEnd: dateEndS, interval: intervalS, window: windowS } = params;

  // get dates in epoch millis, interval and window in millis
  const dateEnd = getDateOrUndefined(dateEndS, 'dateEnd') || Date.now();
  const dateStart = getDateOrUndefined(dateStartS, 'dateStart') || dateEnd;

  if (dateStart > dateEnd) throw new Error(getDateStartAfterDateEndErrorMessage());

  const interval = getDurationOrUndefined(intervalS, 'interval') || 0;
  const window = getDuration(windowS, 'window');

  // Start from the end, as it's more likely the user wants precision there.
  // We'll reverse the resultant ranges at the end, to get ascending order.
  let dateCurrent = dateEnd;
  const dateRanges: DateRange[] = [];

  // Calculate number of intervals; if no interval specified, only calculate one.
  const intervals = !interval ? 1 : 1 + Math.round((dateEnd - dateStart) / interval);
  if (intervals > MAX_INTERVALS) {
    throw new Error(getTooManyIntervalsErrorMessage(intervals, MAX_INTERVALS));
  }

  times(intervals, () => {
    dateRanges.push({
      from: new Date(dateCurrent - window).toISOString(),
      to: new Date(dateCurrent).toISOString(),
    });
    dateCurrent -= interval;
  });

  // reverse in-place
  dateRanges.reverse();

  return {
    dateStart: dateRanges[0].from,
    dateEnd: dateRanges[dateRanges.length - 1].to,
    dateRanges,
  };
}

function getDateOrUndefined(dateS: string | undefined, field: string): number | undefined {
  if (!dateS) return undefined;
  return getDate(dateS, field);
}

function getDate(dateS: string, field: string): number {
  const date = Date.parse(dateS);
  if (isNaN(date)) throw new Error(getParseErrorMessage('date', field, dateS));

  return date.valueOf();
}

function getDurationOrUndefined(durationS: string | undefined, field: string): number | undefined {
  if (!durationS) return undefined;
  return getDuration(durationS, field);
}

function getDuration(durationS: string, field: string): number {
  try {
    return parseDuration(durationS);
  } catch (err) {
    throw new Error(getParseErrorMessage('duration', field, durationS));
  }
}

function getParseErrorMessage(formatName: string, fieldName: string, fieldValue: string) {
  return i18n.translate('xpack.alertingBuiltins.indexThreshold.formattedFieldErrorMessage', {
    defaultMessage: 'invalid {formatName} format for {fieldName}: "{fieldValue}"',
    values: {
      formatName,
      fieldName,
      fieldValue,
    },
  });
}

export function getTooManyIntervalsErrorMessage(intervals: number, maxIntervals: number) {
  return i18n.translate('xpack.alertingBuiltins.indexThreshold.maxIntervalsErrorMessage', {
    defaultMessage:
      'calculated number of intervals {intervals} is greater than maximum {maxIntervals}',
    values: {
      intervals,
      maxIntervals,
    },
  });
}

export function getDateStartAfterDateEndErrorMessage(): string {
  return i18n.translate('xpack.alertingBuiltins.indexThreshold.dateStartGTdateEndErrorMessage', {
    defaultMessage: '[dateStart]: is greater than [dateEnd]',
  });
}
