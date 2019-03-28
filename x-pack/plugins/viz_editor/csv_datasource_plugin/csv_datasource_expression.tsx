/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// register all the stuff which the pipeline needs later

// @ts-ignore
import { register } from '@kbn/interpreter/common';

// This simply registers a pipeline function and a pipeline renderer to the global pipeline
// context. It will be used by the editor config which is shipped in the same plugin, but
// it could also be used from somewhere else.

function filterColumns(keep: string[], columns: Array<{ id: string; type: string }>) {
  return keep.map(columnId => {
    return columns.find(column => column.id === columnId);
  });
}

function filterRows(keep: string[], rows: Array<{ [id: string]: any }>) {
  return rows.map(row => {
    const newRow = {} as any;
    keep.forEach(columnId => {
      newRow[columnId] = row[columnId];
    });
    return newRow;
  });
}

function literalTableFunction() {
  return {
    name: 'literal_table',
    type: 'datatable',
    args: {
      lines: {
        types: ['string'],
      },
      keep: {
        types: ['string'],
      },
    },
    context: { types: [] },
    fn(context: any, args: any) {
      const text = JSON.parse(args.lines) as string[];
      const keepColumns: string[] = JSON.parse(args.keep);

      const rows = text.map(row => row.split(','));
      const headerRow = rows.shift() as string[];
      const firstRow = rows[0];

      const columns: Array<{ id: string; type: string }> = headerRow.map(
        (columnHeader: string, index: number) => ({
          id: columnHeader,
          type: /\d+/.test(firstRow[index]) ? 'number' : 'string',
        })
      );

      const parsedRows = rows.map(row => {
        const parsedRow = {} as any;
        row.forEach((val, index) => {
          const currentColumn = columns[index];
          parsedRow[currentColumn.id] = currentColumn.type === 'string' ? val : Number(val);
        });
        return parsedRow;
      });

      return {
        type: 'datatable',
        rows: filterRows(keepColumns, parsedRows),
        columns: filterColumns(keepColumns, columns),
      };
    },
  };
}

export const registerPipeline = (registries: any) => {
  register(registries, {
    browserFunctions: [literalTableFunction],
  });
};

/*
Working example:
col-1,count
1,1
2,5
3,4
4,0
5,2
6,2
7,8
8,8
9,4
*/
