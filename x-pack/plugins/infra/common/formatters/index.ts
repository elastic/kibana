/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBytesFormatter } from './bytes';
import { formatNumber } from './number';
import { formatPercent } from './percent';
import { InventoryFormatterType } from '../inventory_models/types';
import { formatHighPrecision } from './high_precision';
import { InfraWaffleMapDataFormat } from './types';

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
  highPrecision: formatHighPrecision,
};

export const createFormatter =
  (format: InventoryFormatterType, template: string = '{{value}}') =>
  (val: string | number) => {
    if (val == null) {
      return '';
    }
    const fmtFn = FORMATTERS[format];
    const value = fmtFn(Number(val));
    return template.replace(/{{value}}/g, value);
  };
