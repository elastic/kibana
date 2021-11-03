/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { Maybe } from '../../../typings/common';
import { NOT_AVAILABLE_LABEL } from '../../i18n';
import { isFiniteNumber } from '../is_finite_number';

export function asDecimal(value?: number | null) {
  if (!isFiniteNumber(value)) {
    return NOT_AVAILABLE_LABEL;
  }

  return numeral(value).format('0,0.0');
}

export function asPreciseDecimal(value?: number | null, dp: number = 3) {
  if (!isFiniteNumber(value)) {
    return NOT_AVAILABLE_LABEL;
  }

  return numeral(value).format(`0,0.${'0'.repeat(dp)}`);
}

export function asInteger(value?: number | null) {
  if (!isFiniteNumber(value)) {
    return NOT_AVAILABLE_LABEL;
  }

  return numeral(value).format('0,0');
}

export function asPercent(
  numerator: Maybe<number>,
  denominator: number | undefined,
  fallbackResult = NOT_AVAILABLE_LABEL
) {
  if (!denominator || !isFiniteNumber(numerator)) {
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

export function asDecimalOrInteger(value: number, threshold = 10) {
  // exact 0 or above threshold should not have decimal
  if (value === 0 || value >= threshold) {
    return asInteger(value);
  }
  return asDecimal(value);
}
