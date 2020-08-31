/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunctionDefinition, KibanaDatatable } from 'src/plugins/expressions/public';

interface FormatColumn {
  format: string;
  columnId: string;
  decimals?: number;
}

const supportedFormats: Record<string, { decimalsToPattern: (decimals?: number) => string }> = {
  number: {
    decimalsToPattern: (decimals = 2) => {
      if (decimals === 0) {
        return `0,0`;
      }
      return `0,0.${'0'.repeat(decimals)}`;
    },
  },
  percent: {
    decimalsToPattern: (decimals = 2) => {
      if (decimals === 0) {
        return `0,0%`;
      }
      return `0,0.${'0'.repeat(decimals)}%`;
    },
  },
  bytes: {
    decimalsToPattern: (decimals = 2) => {
      if (decimals === 0) {
        return `0,0b`;
      }
      return `0,0.${'0'.repeat(decimals)}b`;
    },
  },
};

export const formatColumn: ExpressionFunctionDefinition<
  'lens_format_column',
  KibanaDatatable,
  FormatColumn,
  KibanaDatatable
> = {
  name: 'lens_format_column',
  type: 'kibana_datatable',
  help: '',
  args: {
    format: {
      types: ['string'],
      help: '',
      required: true,
    },
    columnId: {
      types: ['string'],
      help: '',
      required: true,
    },
    decimals: {
      types: ['number'],
      help: '',
    },
  },
  inputTypes: ['kibana_datatable'],
  fn(input, { format, columnId, decimals }: FormatColumn) {
    return {
      ...input,
      columns: input.columns.map((col) => {
        if (col.id === columnId) {
          if (supportedFormats[format]) {
            return {
              ...col,
              formatHint: {
                id: format,
                params: { pattern: supportedFormats[format].decimalsToPattern(decimals) },
              },
            };
          } else {
            return {
              ...col,
              formatHint: { id: format, params: {} },
            };
          }
        }
        return col;
      }),
    };
  },
};
