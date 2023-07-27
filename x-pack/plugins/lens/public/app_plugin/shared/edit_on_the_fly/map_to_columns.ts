/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/public';

export const mapDataToColumns = (data: Datatable, fieldList: DatatableColumn[]): Datatable => {
  return {
    ...data,
    rows: data.rows.map((row) => {
      const mappedRow: Record<string, unknown> = {};

      Object.entries(row).forEach(([id, value]) => {
        const col = fieldList.find((f) => f.name === id);
        if (col) {
          mappedRow[col.id] = value;
        } else {
          mappedRow[id] = value;
        }
      });

      return mappedRow;
    }),
    columns: data.columns.map((column) => {
      const col = fieldList.find((f) => f.name === column.name);
      if (col) {
        return {
          ...column,
          id: col.id,
        };
      } else {
        return column;
      }
    }),
  };
};
