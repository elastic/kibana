/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormatColumnExpressionFunction } from './types';

export interface FormatColumnArgs {
  format: string;
  columnId: string;
  decimals?: number;
  suffix?: string;
  compact?: boolean;
  pattern?: string;
  parentFormat?: string;
  fromUnit?: string;
  toUnit?: string;
}

export const formatColumn: FormatColumnExpressionFunction = {
  name: 'lens_format_column',
  type: 'datatable',
  args: {
    format: {
      types: ['string'],
      required: true,
    },
    columnId: {
      types: ['string'],
      required: true,
    },
    decimals: {
      types: ['number'],
    },
    suffix: {
      types: ['string'],
    },
    parentFormat: {
      types: ['string'],
    },
    compact: {
      types: ['boolean'],
    },
    pattern: {
      types: ['string'],
    },
    fromUnit: {
      types: ['string'],
    },
    toUnit: {
      types: ['string'],
    },
  },
  inputTypes: ['datatable'],
  async fn(...args) {
    /** Build optimization: prevent adding extra code into initial bundle **/
    const { formatColumnFn } = await import('./format_column_fn');
    return formatColumnFn(...args);
  },
};
