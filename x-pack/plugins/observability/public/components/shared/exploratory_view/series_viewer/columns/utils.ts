/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import dateMath from '@elastic/datemath';
import _isString from 'lodash/isString';

const LAST = 'Last';
const NEXT = 'Next';

const isNow = (value: string) => value === 'now';

export const isString = (value: any): value is string => _isString(value);
export interface QuickSelect {
  timeTense: string;
  timeValue: number;
  timeUnits: TimeUnitId;
}
export type TimeUnitFromNowId = 's+' | 'm+' | 'h+' | 'd+' | 'w+' | 'M+' | 'y+';
export type TimeUnitId = 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y';

export interface RelativeOption {
  text: string;
  value: TimeUnitId | TimeUnitFromNowId;
}

export const relativeOptions: RelativeOption[] = [
  { text: 'Seconds ago', value: 's' },
  { text: 'Minutes ago', value: 'm' },
  { text: 'Hours ago', value: 'h' },
  { text: 'Days ago', value: 'd' },
  { text: 'Weeks ago', value: 'w' },
  { text: 'Months ago', value: 'M' },
  { text: 'Years ago', value: 'y' },

  { text: 'Seconds from now', value: 's+' },
  { text: 'Minutes from now', value: 'm+' },
  { text: 'Hours from now', value: 'h+' },
  { text: 'Days from now', value: 'd+' },
  { text: 'Weeks from now', value: 'w+' },
  { text: 'Months from now', value: 'M+' },
  { text: 'Years from now', value: 'y+' },
];

const timeUnitIds = relativeOptions
  .map(({ value }) => value)
  .filter((value) => !value.includes('+')) as TimeUnitId[];

export const relativeUnitsFromLargestToSmallest = timeUnitIds.reverse();

/**
 * This function returns time value, time unit and time tense for a given time string.
 *
 * For example: for `now-40m` it will parse output as time value to `40` time unit to `m` and time unit to `last`.
 *
 * If given a datetime string it will return a default value.
 *
 * If the given string is in the format such as `now/d` it will parse the string to moment object and find the time value, time unit and time tense using moment
 *
 * This function accepts two strings start and end time. I the start value is now then it uses the end value to parse.
 */
export function parseTimeParts(start: string, end: string): QuickSelect | null {
  const value = isNow(start) ? end : start;

  const matches = isString(value) && value.match(/now(([-+])(\d+)([smhdwMy])(\/[smhdwMy])?)?/);

  if (!matches) {
    return null;
  }

  const operator = matches[2];
  const matchedTimeValue = matches[3];
  const timeUnits = matches[4] as TimeUnitId;

  if (matchedTimeValue && timeUnits && operator) {
    return {
      timeTense: operator === '+' ? NEXT : LAST,
      timeUnits,
      timeValue: parseInt(matchedTimeValue, 10),
    };
  }

  const duration = moment.duration(moment().diff(dateMath.parse(value)));
  let unitOp = '';
  for (let i = 0; i < relativeUnitsFromLargestToSmallest.length; i++) {
    const as = duration.as(relativeUnitsFromLargestToSmallest[i]);
    if (as < 0) {
      unitOp = '+';
    }
    if (Math.abs(as) > 1) {
      return {
        timeValue: Math.round(Math.abs(as)),
        timeUnits: relativeUnitsFromLargestToSmallest[i],
        timeTense: unitOp === '+' ? NEXT : LAST,
      };
    }
  }

  return null;
}
