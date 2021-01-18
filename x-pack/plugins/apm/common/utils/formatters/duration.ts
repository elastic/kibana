/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { memoize } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
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

type TimeFormatterBuilder = (max: number) => TimeFormatter;

function getUnitLabelAndConvertedValue(
  unitKey: DurationTimeUnit,
  value: number
) {
  switch (unitKey) {
    case 'hours': {
      return {
        unitLabel: i18n.translate('xpack.apm.formatters.hoursTimeUnitLabel', {
          defaultMessage: 'h',
        }),
        convertedValue: asDecimalOrInteger(
          moment.duration(value / 1000).asHours()
        ),
      };
    }
    case 'minutes': {
      return {
        unitLabel: i18n.translate('xpack.apm.formatters.minutesTimeUnitLabel', {
          defaultMessage: 'min',
        }),
        convertedValue: asDecimalOrInteger(
          moment.duration(value / 1000).asMinutes()
        ),
      };
    }
    case 'seconds': {
      return {
        unitLabel: i18n.translate('xpack.apm.formatters.secondsTimeUnitLabel', {
          defaultMessage: 's',
        }),
        convertedValue: asDecimalOrInteger(
          moment.duration(value / 1000).asSeconds()
        ),
      };
    }
    case 'milliseconds': {
      return {
        unitLabel: i18n.translate('xpack.apm.formatters.millisTimeUnitLabel', {
          defaultMessage: 'ms',
        }),
        convertedValue: asDecimalOrInteger(
          moment.duration(value / 1000).asMilliseconds()
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
}: {
  unit: DurationTimeUnit;
  microseconds: Maybe<number>;
  defaultValue?: string;
}): ConvertedDuration {
  if (!isFiniteNumber(microseconds)) {
    return { value: defaultValue, formatted: defaultValue };
  }

  const { convertedValue, unitLabel } = getUnitLabelAndConvertedValue(
    unit,
    microseconds
  );

  return {
    value: convertedValue,
    unit: unitLabel,
    formatted: `${convertedValue} ${unitLabel}`,
  };
}

export const toMicroseconds = (value: number, timeUnit: TimeUnit) =>
  moment.duration(value, timeUnit).asMilliseconds() * 1000;

function getDurationUnitKey(max: number): DurationTimeUnit {
  if (max > toMicroseconds(10, 'hours')) {
    return 'hours';
  }
  if (max > toMicroseconds(10, 'minutes')) {
    return 'minutes';
  }
  if (max > toMicroseconds(10, 'seconds')) {
    return 'seconds';
  }
  if (max > toMicroseconds(1, 'milliseconds')) {
    return 'milliseconds';
  }
  return 'microseconds';
}

export const getDurationFormatter: TimeFormatterBuilder = memoize(
  (max: number) => {
    const unit = getDurationUnitKey(max);
    return (value, { defaultValue }: FormatterOptions = {}) => {
      return convertTo({ unit, microseconds: value, defaultValue });
    };
  }
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
    defaultMessage: `{value} tpm`,
    values: {
      value: displayedValue,
    },
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
