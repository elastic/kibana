/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compact, pick } from 'lodash';
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

export function getStart(prevState: IUrlParams, rangeFrom?: string) {
  if (prevState.rangeFrom !== rangeFrom) {
    return getParsedDate(rangeFrom);
  }
  return prevState.start;
}

export function getEnd(prevState: IUrlParams, rangeTo?: string) {
  if (prevState.rangeTo !== rangeTo) {
    return getParsedDate(rangeTo, { roundUp: true });
  }
  return prevState.end;
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

export function removeUndefinedProps<T>(obj: T): Partial<T> {
  return pick(obj, value => value !== undefined);
}

export function getPathParams(pathname: string = '') {
  const paths = getPathAsArray(pathname);
  const pageName = paths[1];

  // TODO: use react router's real match params instead of guessing the path order
  switch (pageName) {
    case 'transactions':
      return {
        processorEvent: 'transaction',
        serviceName: paths[0],
        transactionType: paths[2],
        transactionName: paths[3]
      };
    case 'errors':
      return {
        processorEvent: 'error',
        serviceName: paths[0],
        errorGroupId: paths[2]
      };
    case 'metrics':
      return {
        processorEvent: 'metric',
        serviceName: paths[0]
      };
    default:
      return {
        processorEvent: 'transaction',
        serviceName: paths[0]
      };
  }
}
