/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { OriginalColumn, MapToColumnsExpressionFunction } from './types';

function getColumnName(originalColumn: OriginalColumn, newColumn: DatatableColumn) {
  if (originalColumn?.operationType === 'date_histogram') {
    const fieldName = originalColumn.sourceField as string;

    // HACK: This is a hack, and introduces some fragility into
    // column naming. Eventually, this should be calculated and
    // built more systematically.
    return newColumn.name.replace(fieldName, originalColumn.label);
  }

  return originalColumn.label;
}

export const mapToOriginalColumns: MapToColumnsExpressionFunction['fn'] = (
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
        } else {
          mappedRow[id] = value;
        }
      });

      return mappedRow;
    }),
    columns: data.columns
      .map((column) => {
        const originalColumns = idMap[column.id];

        if (!originalColumns) {
          return column;
        }

        return originalColumns.map((originalColumn) => ({
          ...column,
          id: originalColumn.id,
          name: getColumnName(originalColumn, column),
        }));
      })
      .flat(),
  };
};
