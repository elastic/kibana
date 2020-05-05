/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Mustache from 'mustache';
import { InfraWaffleMapDataFormat } from '../../lib/lib';
import { createBytesFormatter } from './bytes';
import { formatNumber } from './number';
import { formatPercent } from './percent';
import { InventoryFormatterType } from '../../../common/inventory_models/types';
import { formatHighPercision } from './high_precision';

export const FORMATTERS = {
  number: formatNumber,
  // Because the implimentation for formatting large numbers is the same as formatting
  // bytes we are re-using the same code, we just format the number using the abbreviated number format.
  abbreviatedNumber: createBytesFormatter(InfraWaffleMapDataFormat.abbreviatedNumber),
  // bytes in bytes formatted string out
  bytes: createBytesFormatter(InfraWaffleMapDataFormat.bytesDecimal),
  // bytes in bits formatted string out
  bits: createBytesFormatter(InfraWaffleMapDataFormat.bitsDecimal),
  percent: formatPercent,
  highPercision: formatHighPercision,
};

export const createFormatter = (format: InventoryFormatterType, template: string = '{{value}}') => (
  val: string | number
) => {
  if (val == null) {
    return '';
  }
  const fmtFn = FORMATTERS[format];
  const value = fmtFn(Number(val));
  return Mustache.render(template, { value });
};
