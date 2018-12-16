/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { memoize } from 'lodash';

const SECONDS_CUT_OFF = 10 * 1000000; // 10 seconds (in microseconds)
const MILLISECONDS_CUT_OFF = 10 * 1000; // 10 milliseconds (in microseconds)

/*
 * value: time in microseconds
 * withUnit: add unit suffix
 * defaultValue: value to use if the specified is null/undefined
 */
type FormatterValue = number | undefined | null;
interface FormatterOptions {
  withUnit?: boolean;
  defaultValue?: string;
}

export function asSeconds(
  value: FormatterValue,
  { withUnit = true, defaultValue = 'N/A' }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }
  const formatted = asDecimal(value / 1000000);
  return `${formatted}${withUnit ? ' s' : ''}`;
}

export function asMillis(
  value: FormatterValue,
  { withUnit = true, defaultValue = 'N/A' }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }

  const formatted = asInteger(value / 1000);
  return `${formatted}${withUnit ? ' ms' : ''}`;
}

export function asMicros(
  value: FormatterValue,
  { withUnit = true, defaultValue = 'N/A' }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }

  const formatted = asInteger(value);
  return `${formatted}${withUnit ? ' μs' : ''}`;
}

type TimeFormatter = (
  max: number
) => (
  value: FormatterValue,
  { withUnit, defaultValue }: FormatterOptions
) => string;

export const getTimeFormatter: TimeFormatter = memoize((max: number) => {
  const unit = timeUnit(max);
  switch (unit) {
    case 's':
      return asSeconds;
    case 'ms':
      return asMillis;
    case 'us':
      return asMicros;
  }
});

export function timeUnit(max: number) {
  if (max > SECONDS_CUT_OFF) {
    return 's';
  } else if (max > MILLISECONDS_CUT_OFF) {
    return 'ms';
  } else {
    return 'us';
  }
}

export function asTime(
  value: FormatterValue,
  { withUnit = true, defaultValue = 'N/A' }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }
  const formatter = getTimeFormatter(value);
  return formatter(value, { withUnit, defaultValue });
}

export function asDecimal(value: number) {
  return numeral(value).format('0,0.0');
}

export function asInteger(value: number) {
  return numeral(value).format('0,0');
}

export function tpmUnit(type: string) {
  return type === 'request' ? 'rpm' : 'tpm';
}

export function asPercent(
  numerator: number,
  denominator = 0,
  fallbackResult = ''
) {
  if (denominator === 0) {
    return fallbackResult;
  }
  return numeral(numerator / denominator).format('0.00%');
}
