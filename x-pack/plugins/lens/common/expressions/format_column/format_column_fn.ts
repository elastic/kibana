/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { supportedFormats } from './supported_formats';
import type { DatatableColumn } from '../../../../../../src/plugins/expressions';
import type { FormatColumnArgs } from './index';
import type { FormatColumnExpressionFunction } from './types';

function isNestedFormat(params: DatatableColumn['meta']['params']) {
  // if there is a nested params object with an id, it's a nested format
  return !!params?.params?.id;
}

function withParams(col: DatatableColumn, params: Record<string, unknown>) {
  return { ...col, meta: { ...col.meta, params } };
}

export const formatColumnFn: FormatColumnExpressionFunction['fn'] = (
  input,
  { format, columnId, decimals, parentFormat }: FormatColumnArgs
) => ({
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
});
