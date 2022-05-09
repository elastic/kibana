/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { memoize } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../../i18n';
import { asDecimalOrInteger, asInteger, asDecimal } from './formatters';
import { TimeUnit } from './datetime';
import { Maybe } from '../../../typings/common';
import { isFiniteNumber } from '../is_finite_number';

interface FormatterOptions {
  defaultValue?: string;
}

type DurationTimeUnit = TimeUnit | 'microseconds';

interface ConvertedDuration {
  value: string;
  unit?: string;
  formatted: string;
}

export type TimeFormatter = (
  value: Maybe<number>,
  options?: FormatterOptions
) => ConvertedDuration;

type TimeFormatterBuilder = (max: number, threshold?: number) => TimeFormatter;

// threshold defines the value from which upwards there should be no decimal places.
function getUnitLabelAndConvertedValue(
  unitKey: DurationTimeUnit,
  value: number,
  threshold: number = 10
) {
  const ms = value / 1000;

  switch (unitKey) {
    case 'hours': {
      return {
        unitLabel: i18n.translate('xpack.apm.formatters.hoursTimeUnitLabel', {
          defaultMessage: 'h',
        }),
        convertedValue: asDecimalOrInteger(
          moment.duration(ms).asHours(),
          threshold
        ),
      };
    }
    case 'minutes': {
      return {
        unitLabel: i18n.translate('xpack.apm.formatters.minutesTimeUnitLabel', {
          defaultMessage: 'min',
        }),
        convertedValue: asDecimalOrInteger(
          moment.duration(ms).asMinutes(),
          threshold
        ),
      };
    }
    case 'seconds': {
      return {
        unitLabel: i18n.translate('xpack.apm.formatters.secondsTimeUnitLabel', {
          defaultMessage: 's',
        }),
        convertedValue: asDecimalOrInteger(
          moment.duration(ms).asSeconds(),
          threshold
        ),
      };
    }
    case 'milliseconds': {
      return {
        unitLabel: i18n.translate('xpack.apm.formatters.millisTimeUnitLabel', {
          defaultMessage: 'ms',
        }),
        convertedValue: asDecimalOrInteger(
          moment.duration(ms).asMilliseconds(),
          threshold
        ),
      };
    }
    case 'microseconds': {
      return {
        unitLabel: i18n.translate('xpack.apm.formatters.microsTimeUnitLabel', {
          defaultMessage: 'μs',
        }),
        convertedValue: asInteger(value),
      };
    }
  }
}

/**
 * Converts a microseconds value into the unit defined.
 */
function convertTo({
  unit,
  microseconds,
  defaultValue = NOT_AVAILABLE_LABEL,
  threshold = 10,
}: {
  unit: DurationTimeUnit;
  microseconds: Maybe<number>;
  defaultValue?: string;
  threshold?: number;
}): ConvertedDuration {
  if (!isFiniteNumber(microseconds)) {
    return { value: defaultValue, formatted: defaultValue };
  }

  const { convertedValue, unitLabel } = getUnitLabelAndConvertedValue(
    unit,
    microseconds,
    threshold
  );

  return {
    value: convertedValue,
    unit: unitLabel,
    formatted: `${convertedValue} ${unitLabel}`,
  };
}

export const toMicroseconds = (value: number, timeUnit: TimeUnit) =>
  moment.duration(value, timeUnit).asMilliseconds() * 1000;

function getDurationUnitKey(max: number, threshold = 10): DurationTimeUnit {
  if (max > toMicroseconds(threshold, 'hours')) {
    return 'hours';
  }
  if (max > toMicroseconds(threshold, 'minutes')) {
    return 'minutes';
  }
  if (max > toMicroseconds(threshold, 'seconds')) {
    return 'seconds';
  }
  if (max > toMicroseconds(1, 'milliseconds')) {
    return 'milliseconds';
  }
  return 'microseconds';
}

// memoizer with a custom resolver to consider both arguments max/threshold.
// by default lodash's memoize only considers the first argument.
export const getDurationFormatter: TimeFormatterBuilder = memoize(
  (max: number, threshold: number = 10) => {
    const unit = getDurationUnitKey(max, threshold);
    return (value: Maybe<number>, { defaultValue }: FormatterOptions = {}) => {
      return convertTo({ unit, microseconds: value, defaultValue, threshold });
    };
  },
  (max, threshold) => `${max}_${threshold}`
);

export function asTransactionRate(value: Maybe<number>) {
  if (!isFiniteNumber(value)) {
    return NOT_AVAILABLE_LABEL;
  }

  let displayedValue: string;

  if (value === 0) {
    displayedValue = '0';
  } else if (value <= 0.1) {
    displayedValue = '< 0.1';
  } else {
    displayedValue = asDecimal(value);
  }

  return i18n.translate('xpack.apm.transactionRateLabel', {
    defaultMessage: `{displayedValue} tpm`,
    values: { displayedValue },
  });
}

export function asExactTransactionRate(value: number) {
  return i18n.translate('xpack.apm.exactTransactionRateLabel', {
    defaultMessage: `{value} tpm`,
    values: { value: asDecimalOrInteger(value) },
  });
}
/**
 * Converts value and returns it formatted - 00 unit
 */
export function asDuration(
  value: Maybe<number>,
  { defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (!isFiniteNumber(value)) {
    return defaultValue;
  }

  const formatter = getDurationFormatter(value);
  return formatter(value, { defaultValue }).formatted;
}
/**
 * Convert a microsecond value to decimal milliseconds. Normally we use
 * `asDuration`, but this is used in places like tables where we always want
 * the same units.
 */
export function asMillisecondDuration(value: Maybe<number>) {
  return convertTo({
    unit: 'milliseconds',
    microseconds: value,
  }).formatted;
}
