/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { OriginalColumn, MapToColumnsExpressionFunction } from './types';

export const mapToOriginalColumnsTextBased: MapToColumnsExpressionFunction['fn'] = (
  data,
  { idMap: encodedIdMap }
) => {
  const idMap = JSON.parse(encodedIdMap) as Record<string, OriginalColumn[]>;

  return {
    ...data,
    rows: data.rows.map((row) => {
      const mappedRow: Record<string, unknown> = {};

      for (const id in row) {
        if (id in idMap) {
          for (const cachedEntry of idMap[id]) {
            mappedRow[cachedEntry.id] = row[id]; // <= I wrote idMap rather than mappedRow
          }
        }
      }

      return mappedRow;
    }),
    columns: data.columns.flatMap((column) => {
      if (!(column.id in idMap)) {
        return [];
      }

      return idMap[column.id].map((originalColumn) => {
        return {
          ...column,
          id: originalColumn.id,
          name: originalColumn.label,
          meta: {
            ...column.meta,
            ...(originalColumn.params && 'format' in (originalColumn.params as object)
              ? {
                  params: (originalColumn.params as Record<string, unknown>)
                    .format as SerializedFieldFormat,
                }
              : {}),
            ...(originalColumn.sourceField ? { field: originalColumn.sourceField } : {}),
            sourceParams: {
              ...column.meta.sourceParams,
              sourceField: originalColumn.sourceField,
              operationType: originalColumn.operationType,
              interval: originalColumn.interval,
            },
          },
        };
      });
    }),
  };
};
