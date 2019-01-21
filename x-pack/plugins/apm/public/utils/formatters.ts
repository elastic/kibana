/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { memoize } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../constants';

const SECONDS_CUT_OFF = 10 * 1000000; // 10 seconds (in microseconds)
const MILLISECONDS_CUT_OFF = 10 * 1000; // 10 milliseconds (in microseconds)
const SPACE = ' ';

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
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }
  const secondsLabel =
    SPACE +
    i18n.translate('xpack.apm.formatters.secondsTimeUnitLabel', {
      defaultMessage: 's'
    });
  const formatted = asDecimal(value / 1000000);
  return `${formatted}${withUnit ? secondsLabel : ''}`;
}

export function asMillis(
  value: FormatterValue,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }

  const millisLabel =
    SPACE +
    i18n.translate('xpack.apm.formatters.millisTimeUnitLabel', {
      defaultMessage: 'ms'
    });
  const formatted = asInteger(value / 1000);
  return `${formatted}${withUnit ? millisLabel : ''}`;
}

export function asMicros(
  value: FormatterValue,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }

  const microsLabel =
    SPACE +
    i18n.translate('xpack.apm.formatters.microsTimeUnitLabel', {
      defaultMessage: 'μs'
    });
  const formatted = asInteger(value);
  return `${formatted}${withUnit ? microsLabel : ''}`;
}

type TimeFormatter = (
  max: number
) => (value: FormatterValue, options: FormatterOptions) => string;

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
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
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

export function tpmUnit(type?: string) {
  return type === 'request'
    ? i18n.translate('xpack.apm.formatters.requestsPerMinLabel', {
        defaultMessage: 'rpm'
      })
    : i18n.translate('xpack.apm.formatters.transactionsPerMinLabel', {
        defaultMessage: 'tpm'
      });
}

export function asPercent(
  numerator: number,
  denominator: number | undefined,
  fallbackResult = ''
) {
  if (!denominator) {
    return fallbackResult;
  }

  const decimal = numerator / denominator;
  return numeral(decimal).format('0.0%');
}
