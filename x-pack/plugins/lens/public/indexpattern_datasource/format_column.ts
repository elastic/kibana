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

export interface FormatColumnArgs {
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
  FormatColumnArgs,
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
  fn(input, { format, columnId, decimals, parentFormat }: FormatColumnArgs) {
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
            // if original format is already a nested one, we are just replacing the wrapper params
            // otherwise wrapping it inside parentFormatId/parentFormatParams
            const isNested = isNestedFormat(col.meta.params);
            const innerParams = isNested
              ? col.meta.params?.params
              : { id: col.meta.params?.id, params: col.meta.params?.params };

            const formatId = isNested ? col.meta.params?.id : parentFormatId;

            return withParams(col, {
              ...col.meta.params,
              id: formatId,
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

function isNestedFormat(params: DatatableColumn['meta']['params']) {
  // if there is a nested params object with an id, it's a nested format
  return !!params?.params?.id;
}

function withParams(col: DatatableColumn, params: Record<string, unknown>) {
  return { ...col, meta: { ...col.meta, params } };
}
