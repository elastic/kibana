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
  // console.log({ data, idMap });

  // console.dir({
  //   ...data,
  //   rows: data.rows.map((row) => {
  //     const mappedRow: Record<string, unknown> = {};

  //     for (const id in row) {
  //       if (id in idMap) {
  //         for (const cachedEntry of idMap[id]) {
  //           mappedRow[cachedEntry.id] = row[id];
  //         }
  //       } else {
  //         const col = data.columns.find((c) => c.id === id);
  //         if (col?.variable) {
  //           const originalColumn = Object.values(idMap).find((idMapCol) => {
  //             return idMapCol.some((c) => c.variable === col.variable);
  //           });
  //           if (originalColumn) {
  //             for (const cachedEntry of originalColumn) {
  //               mappedRow[cachedEntry.id] = row[id];
  //             }
  //           }
  //         }
  //       }
  //     }

  //     return mappedRow;
  //   }),
  //   columns: data.columns.flatMap((column) => {
  //     if (!(column.id in idMap) && !column.variable) {
  //       return [];
  //     }
  //     if (column.variable) {
  //       const originalColumn = Object.values(idMap).find((idMapCol) => {
  //         return idMapCol.some((c) => c.variable === column.variable);
  //       });
  //       if (!originalColumn) {
  //         return [];
  //       }

  //       return originalColumn.map((c) => ({ ...column, id: c.id }));
  //     }
  //     return idMap[column.id].map((originalColumn) => ({ ...column, id: originalColumn.id }));
  //   }),
  // });

  return {
    ...data,
    rows: data.rows.map((row) => {
      const mappedRow: Record<string, unknown> = {};

      for (const id in row) {
        if (id in idMap) {
          for (const cachedEntry of idMap[id]) {
            mappedRow[cachedEntry.id] = row[id];
          }
        } else {
          const col = data.columns.find((c) => c.id === id);
          if (col?.variable) {
            const originalColumn = Object.values(idMap).find((idMapCol) => {
              return idMapCol.some((c) => c.variable === col.variable);
            });
            if (originalColumn) {
              for (const cachedEntry of originalColumn) {
                mappedRow[cachedEntry.id] = row[id];
              }
            }
          }
        }
      }

      return mappedRow;
    }),
    columns: data.columns.flatMap((column) => {
      if (!(column.id in idMap) && !column.variable) {
        return [];
      }
      if (column.variable) {
        const originalColumn = Object.values(idMap).find((idMapCol) => {
          return idMapCol.some((c) => c.variable === column.variable);
        });
        if (!originalColumn) {
          return [];
        }

        return originalColumn.map((c) => ({ ...column, id: c.id }));
      }
      return idMap[column.id].map((originalColumn) => ({ ...column, id: originalColumn.id }));
    }),
  };
};
