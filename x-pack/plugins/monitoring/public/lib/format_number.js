/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import 'moment-duration-format';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';

export function formatBytesUsage(used, max) {
  return formatNumber(used, 'byte') + ' / ' + formatNumber(max, 'byte');
}

export function formatPercentageUsage(used, max) {
  return formatNumber(used / max, '0.00%');
}

export function formatNumber(num, which) {
  const isNan = Number.isNaN(num);
  let format = '0,0.0';
  if (typeof num !== 'number' || isNan) {
    if (num !== undefined && !isNan) {
      return num; // strings such as 'N/A' stay untouched
    }
    num = 0;
    format = '0'; // NaN/undefined becomes '0' not '0.0'
  }
  let postfix = '';
  switch (which) {
    case 'time_since':
      return moment(moment() - num).from(moment(), true);
    case 'time':
      return moment(num).format('H:mm:ss');
    case 'int_commas':
      format = '0,0';
      break;
    case 'byte':
    case 'bytes':
      format += ' b';
      break;
    case 'ms':
      postfix = 'ms';
      break;
    default:
      if (which) {
        format = which;
      }
  }
  return numeral(num).format(format) + postfix;
}

export function formatMetric(value, format, suffix, options = {}) {
  const { prependSpace = true } = options;
  if (Boolean(value) || value === 0) {
    let _suffix = '';
    if (suffix !== undefined) {
      if (prependSpace) {
        _suffix = ` ${suffix}`;
      } else {
        _suffix = suffix;
      }
    }
    return formatNumber(value, format) + _suffix;
  }
  return i18n.translate('xpack.monitoring.formatNumbers.notAvailableLabel', {
    defaultMessage: 'N/A',
  });
}
