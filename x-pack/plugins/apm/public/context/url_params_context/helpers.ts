/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { compact, pickBy } from 'lodash';
import moment from 'moment';
import { IUrlParams } from './types';

function getParsedDate(rawDate?: string, options = {}) {
  if (rawDate) {
    const parsed = datemath.parse(rawDate, options);
    if (parsed && parsed.isValid()) {
      return parsed.toDate();
    }
  }
}

export function getExactDate(rawDate?: string, options = {}) {
  if (rawDate) {
    const isRelativeDate = rawDate.substring(0, 3) === 'now';
    if (isRelativeDate) {
      const rawDateWithouRounding = rawDate.replace(/\/(\w)$/, '');
      return getParsedDate(rawDateWithouRounding, options);
    }
  }
}

export function getDateRange({
  state,
  rangeFrom,
  rangeTo,
}: {
  state: IUrlParams;
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

  // `getParsedDate` will return undefined for invalid or empty dates. We return
  // the previous state if either date is undefined.
  if (!start || !end) {
    return {
      start: state.start,
      exactStart: state.start,
      end: state.end,
      exactEnd: state.end,
    };
  }

  // rounds down start to minute
  const roundedStart = moment(start).startOf('minute');
  // rounds down to minute
  const exactStart = getExactDate(rangeFrom) || roundedStart;
  const exactEnd = getExactDate(rangeTo, { roundUp: true }) || end;

  return {
    start: roundedStart.toISOString(),
    exactStart: exactStart.toISOString(),
    end: end.toISOString(),
    exactEnd: exactEnd.toISOString(),
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
