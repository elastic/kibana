/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { scaleUtc } from 'd3-scale';
import { compact, pickBy } from 'lodash';
import { IUrlParams } from './types';

function getParsedDate(rawDate?: string, options = {}) {
  if (rawDate) {
    const parsed = datemath.parse(rawDate, options);
    if (parsed && parsed.isValid()) {
      return parsed.toDate();
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
    return { start: state.start, end: state.end };
  }

  const start = getParsedDate(rangeFrom);
  const end = getParsedDate(rangeTo, { roundUp: true });

  // `getParsedDate` will return undefined for invalid or empty dates. We return
  // the previous state if either date is undefined.
  if (!start || !end) {
    return { start: state.start, end: state.end };
  }

  // Calculate ticks for the time ranges to produce nicely rounded values.
  const ticks = scaleUtc().domain([start, end]).nice().ticks();

  // Return the first and last tick values.
  return {
    start: ticks[0].toISOString(),
    end: ticks[ticks.length - 1].toISOString(),
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
