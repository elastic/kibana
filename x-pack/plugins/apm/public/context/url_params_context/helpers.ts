/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, pickBy } from 'lodash';
import datemath from '@elastic/datemath';
import { IUrlParams } from './types';

export function getParsedDate(rawDate?: string, opts = {}) {
  if (rawDate) {
    const parsed = datemath.parse(rawDate, opts);
    if (parsed) {
      return parsed.toISOString();
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
  if (state.rangeFrom === rangeFrom && state.rangeTo === rangeTo) {
    return { start: state.start, end: state.end };
  }

  return {
    start: getParsedDate(rangeFrom),
    end: getParsedDate(rangeTo, { roundUp: true }),
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
