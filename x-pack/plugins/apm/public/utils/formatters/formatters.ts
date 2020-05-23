/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';

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
  if (!denominator || isNaN(numerator)) {
    return fallbackResult;
  }

  const decimal = numerator / denominator;
  return numeral(decimal).format('0.0%');
}
