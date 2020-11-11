/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ExpressionFunctionDefinition,
  Datatable,
  DatatableColumn,
} from 'src/plugins/expressions/public';

interface FormatColumn {
  format: string;
  columnId: string;
  decimals?: number;
  parentFormat?: string;
}

export const supportedFormats: Record<
  string,
  { decimalsToPattern: (decimals?: number) => string }
> = {
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
  Datatable,
  FormatColumn,
  Datatable
> = {
  name: 'lens_format_column',
  type: 'datatable',
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
    parentFormat: {
      types: ['string'],
      help: '',
    },
  },
  inputTypes: ['datatable'],
  fn(input, { format, columnId, decimals, parentFormat }: FormatColumn) {
    return {
      ...input,
      columns: input.columns.map((col) => {
        if (col.id === columnId) {
          if (!parentFormat) {
            if (supportedFormats[format]) {
              return withParams(col, {
                id: format,
                params: { pattern: supportedFormats[format].decimalsToPattern(decimals) },
              });
            } else if (format) {
              return withParams(col, { id: format });
            } else {
              return col;
            }
          }

          const parsedParentFormat = JSON.parse(parentFormat);
          const parentFormatId = parsedParentFormat.id;
          const parentFormatParams = parsedParentFormat.params ?? {};

          if (!parentFormatId) {
            return col;
          }

          if (format && supportedFormats[format]) {
            return withParams(col, {
              id: parentFormatId,
              params: {
                id: format,
                params: {
                  pattern: supportedFormats[format].decimalsToPattern(decimals),
                },
                ...parentFormatParams,
              },
            });
          }
          if (parentFormatParams) {
            const innerParams = (col.meta.params?.params as Record<string, unknown>) ?? {};
            return withParams(col, {
              ...col.meta.params,
              params: {
                ...innerParams,
                ...parentFormatParams,
              },
            });
          }
        }
        return col;
      }),
    };
  },
};

function withParams(col: DatatableColumn, params: Record<string, unknown>) {
  return { ...col, meta: { ...col.meta, params } };
}
