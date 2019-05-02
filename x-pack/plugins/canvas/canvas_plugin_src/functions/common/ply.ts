/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy, flatten, pick, map } from 'lodash';
import { ContextFunction, Datatable, DatatableColumn } from '../types';

interface Arguments {
  by: string[];
  expression: Array<(datatable: Datatable) => Promise<Datatable>>;
}

type Return = Datatable | Promise<Datatable>;

export function ply(): ContextFunction<'ply', Datatable, Arguments, Return> {
  return {
    name: 'ply',
    type: 'datatable',
    help:
      'Subdivide a datatable and pass the resulting tables into an expression, then merge the output',
    context: {
      types: ['datatable'],
    },
    args: {
      by: {
        types: ['string'],
        help: 'The column to subdivide on',
        multi: true,
      },
      expression: {
        types: ['datatable'],
        resolve: false,
        multi: true,
        aliases: ['fn', 'function'],
        help:
          'An expression to pass each resulting data table into. Tips: \n' +
          ' Expressions must return a datatable. Use `as` to turn literals into datatables.\n' +
          ' Multiple expressions must return the same number of rows.' +
          ' If you need to return a differing row count, pipe into another instance of ply.\n' +
          ' If multiple expressions return the same columns, the last one wins.',
      },
      // In the future it may make sense to add things like shape, or tooltip values, but I think what we have is good for now
      // The way the function below is written you can add as many arbitrary named args as you want.
    },
    fn: (context, args) => {
      if (!args) {
        return context;
      }

      let byColumns: DatatableColumn[];
      let originalDatatables: Datatable[];

      if (args.by) {
        byColumns = args.by.map(by => {
          const column = context.columns.find(col => col.name === by);

          if (!column) {
            throw new Error(`Column not found: '${by}'`);
          }

          return column;
        });

        const keyedDatatables = groupBy(context.rows, row => JSON.stringify(pick(row, args.by)));

        originalDatatables = Object.values(keyedDatatables).map(rows => ({
          ...context,
          rows,
        }));
      } else {
        originalDatatables = [context];
      }

      const datatablePromises = originalDatatables.map(originalDatatable => {
        let expressionResultPromises = [];

        if (args.expression) {
          expressionResultPromises = args.expression.map(expression =>
            expression(originalDatatable)
          );
        } else {
          expressionResultPromises.push(Promise.resolve(originalDatatable));
        }

        return Promise.all(expressionResultPromises).then(combineAcross);
      });

      return Promise.all(datatablePromises).then(newDatatables => {
        // Here we're just merging each for the by splits, so it doesn't actually matter if the rows are the same length
        const columns = combineColumns([byColumns].concat(map(newDatatables, 'columns')));
        const rows = flatten(
          newDatatables.map((dt, i) => {
            const byColumnValues = pick(originalDatatables[i].rows[0], args.by);
            return dt.rows.map(row => ({
              ...byColumnValues,
              ...row,
            }));
          })
        );

        return {
          type: 'datatable',
          rows,
          columns,
        } as Datatable;
      });
    },
  };
}

function combineColumns(arrayOfColumnsArrays: DatatableColumn[][]) {
  return arrayOfColumnsArrays.reduce((resultingColumns, columns) => {
    if (columns) {
      columns.forEach(column => {
        if (resultingColumns.find(resultingColumn => resultingColumn.name === column.name)) {
          return;
        } else {
          resultingColumns.push(column);
        }
      });
    }

    return resultingColumns;
  }, []);
}

// This handles merging the tables produced by multiple expressions run on a single member of the `by` split.
// Thus all tables must be the same length, although their columns do not need to be the same, we will handle combining the columns
function combineAcross(datatableArray: Datatable[]) {
  const [referenceTable] = datatableArray;
  const targetRowLength = referenceTable.rows.length;

  // Sanity check
  datatableArray.forEach(datatable => {
    if (datatable.rows.length !== targetRowLength) {
      throw new Error('All expressions must return the same number of rows');
    }
  });

  // Merge columns and rows.
  const arrayOfRowsArrays = map(datatableArray, 'rows');
  const rows = [];
  for (let i = 0; i < targetRowLength; i++) {
    const rowsAcross = map(arrayOfRowsArrays, i);

    // The reason for the Object.assign is that rowsAcross is an array
    // and those rows need to be applied as arguments to Object.assign
    rows.push(Object.assign({}, ...rowsAcross));
  }

  const columns = combineColumns(map(datatableArray, 'columns'));

  return {
    type: 'datatable',
    rows,
    columns,
  };
}
