/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize } from 'lodash';
import numeral from '@elastic/numeral';

const UNIT_CUT_OFF = 10 * 1000000;

export function asSeconds(value, withUnit = true) {
  const formatted = asDecimal(value / 1000000);
  return `${formatted}${withUnit ? ' s' : ''}`;
}

export function asMillis(value, withUnit = true) {
  const formatted = asInteger(value / 1000);
  return `${formatted}${withUnit ? ' ms' : ''}`;
}

export function asMillisWithDefault(value) {
  if (value == null) {
    return `N/A`;
  }
  return asMillis(value);
}

export const getTimeFormatter = memoize(
  max => (max > UNIT_CUT_OFF ? asSeconds : asMillis)
);

export function timeUnit(max) {
  return max > UNIT_CUT_OFF ? 's' : 'ms';
}

export function asTime(value) {
  return getTimeFormatter(value)(value);
}

export function asDecimal(value) {
  return numeral(value).format('0,0.0');
}

export function asInteger(value) {
  return numeral(value).format('0,0');
}

export function tpmUnit(type) {
  return type === 'request' ? 'rpm' : 'tpm';
}
