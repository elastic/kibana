/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import { compact, pickBy } from 'lodash';
import moment from 'moment';
import { UrlParams } from './types';

function getParsedDate(rawDate?: string, options = {}) {
  if (rawDate) {
    const parsed = datemath.parse(rawDate, options);
    if (parsed && parsed.isValid()) {
      return parsed.toDate();
    }
  }
}

export function getExactDate(rawDate: string) {
  const isRelativeDate = rawDate.startsWith('now');
  if (isRelativeDate) {
    // remove rounding from relative dates "Today" (now/d) and "This week" (now/w)
    const rawDateWithouRounding = rawDate.replace(/\/([smhdw])$/, '');
    return getParsedDate(rawDateWithouRounding);
  }
  return getParsedDate(rawDate);
}

export function getDateRange({
  state = {},
  rangeFrom,
  rangeTo,
}: {
  state?: Pick<
    UrlParams,
    'rangeFrom' | 'rangeTo' | 'start' | 'end' | 'exactStart' | 'exactEnd'
  >;
  rangeFrom?: string;
  rangeTo?: string;
}) {
  // If the previous state had the same range, just return that instead of calculating a new range.
  if (state.rangeFrom === rangeFrom && state.rangeTo === rangeTo) {
    return {
      start: state.start,
      end: state.end,
      exactStart: state.exactStart,
      exactEnd: state.exactEnd,
    };
  }
  const start = getParsedDate(rangeFrom);
  const end = getParsedDate(rangeTo, { roundUp: true });

  const exactStart = rangeFrom ? getExactDate(rangeFrom) : undefined;
  const exactEnd = rangeTo ? getExactDate(rangeTo) : undefined;

  // `getParsedDate` will return undefined for invalid or empty dates. We return
  // the previous state if either date is undefined.
  if (!start || !end) {
    return {
      start: state.start,
      end: state.end,
      exactStart: state.exactStart,
      exactEnd: state.exactEnd,
    };
  }

  // rounds down start to minute
  const roundedStart = moment(start).startOf('minute');

  return {
    start: roundedStart.toISOString(),
    end: end.toISOString(),
    exactStart: exactStart?.toISOString(),
    exactEnd: exactEnd?.toISOString(),
  };
}

export function toNumber(value?: string) {
  if (value !== undefined) {
    return parseInt(value, 10);
  }
}

export function toString(value?: string) {
  if (value === '' || value === 'null' || value === 'undefined') {
    return;
  }
  return value;
}

export function toBoolean(value?: string) {
  return value === 'true';
}

export function getPathAsArray(pathname: string = '') {
  return compact(pathname.split('/'));
}

export function removeUndefinedProps<T extends object>(obj: T): Partial<T> {
  return pickBy(obj, (value) => value !== undefined);
}
