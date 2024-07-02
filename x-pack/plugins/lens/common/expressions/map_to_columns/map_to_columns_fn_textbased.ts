/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

      Object.entries(row).forEach(([id, value]) => {
        if (id in idMap) {
          idMap[id].forEach(({ id: originalId }) => {
            mappedRow[originalId] = value;
          });
        }
      });

      return mappedRow;
    }),
    columns: data.columns.flatMap((column) => {
      if (!(column.id in idMap)) {
        return [];
      }
      return idMap[column.id].map((originalColumn) => ({ ...column, id: originalColumn.id }));
    }),
  };
};
