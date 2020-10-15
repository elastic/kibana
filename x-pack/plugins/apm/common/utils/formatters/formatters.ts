/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { DateBucketUnit } from '../get_date_bucket_options';

export function asDecimal(value: number) {
  return numeral(value).format('0,0.0');
}

export function asInteger(value: number) {
  return numeral(value).format('0,0');
}

export function tpmUnit(unit: DateBucketUnit) {
  return i18n.translate('xpack.apm.formatters.transactionsRateLabel', {
    defaultMessage: 'tp{unit, select, minute {m} second {s}}',
    values: {
      unit,
    },
  });
}

export function asPercent(
  numerator: number,
  denominator: number | undefined,
  fallbackResult = ''
) {
  if (!denominator || isNaN(numerator)) {
    return fallbackResult;
  }

  const decimal = numerator / denominator;

  // 33.2 => 33%
  // 3.32 => 3.3%
  // 0 => 0%
  if (Math.abs(decimal) >= 0.1 || decimal === 0) {
    return numeral(decimal).format('0%');
  }

  return numeral(decimal).format('0.0%');
}

export function asDecimalOrInteger(value: number) {
  // exact 0 or above 10 should not have decimal
  if (value === 0 || value >= 10) {
    return asInteger(value);
  }
  return asDecimal(value);
}
