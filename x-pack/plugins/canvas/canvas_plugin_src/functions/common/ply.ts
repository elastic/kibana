/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy, flatten, pick, map } from 'lodash';
import { Datatable, DatatableColumn, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

interface Arguments {
  by: string[];
  expression: Array<(datatable: Datatable) => Promise<Datatable>>;
}

type Output = Datatable | Promise<Datatable>;

export function ply(): ExpressionFunctionDefinition<'ply', Datatable, Arguments, Output> {
  const { help, args: argHelp } = getFunctionHelp().ply;
  const errors = getFunctionErrors().ply;

  return {
    name: 'ply',
    type: 'datatable',
    inputTypes: ['datatable'],
    help,
    args: {
      by: {
        types: ['string'],
        help: argHelp.by,
        multi: true,
      },
      expression: {
        types: ['datatable'],
        resolve: false,
        multi: true,
        aliases: ['exp', 'fn', 'function'],
        help: argHelp.expression,
      },
    },
    fn: (input, args) => {
      if (!args) {
        return input;
      }

      let byColumns: DatatableColumn[];
      let originalDatatables: Datatable[];

      if (args.by) {
        byColumns = args.by.map((by) => {
          const column = input.columns.find((col) => col.name === by);

          if (!column) {
            throw errors.columnNotFound(by);
          }

          return column;
        });

        const keyedDatatables = groupBy(input.rows, (row) => JSON.stringify(pick(row, args.by)));

        originalDatatables = Object.values(keyedDatatables).map((rows) => ({
          ...input,
          rows,
        }));
      } else {
        originalDatatables = [input];
      }

      const datatablePromises = originalDatatables.map((originalDatatable) => {
        let expressionResultPromises = [];

        if (args.expression) {
          expressionResultPromises = args.expression.map((expression) =>
            expression(originalDatatable)
          );
        } else {
          expressionResultPromises.push(Promise.resolve(originalDatatable));
        }

        return Promise.all(expressionResultPromises).then(combineAcross);
      });

      return Promise.all(datatablePromises).then((newDatatables) => {
        // Here we're just merging each for the by splits, so it doesn't actually matter if the rows are the same length
        const columns = combineColumns([byColumns].concat(map(newDatatables, 'columns')));
        const rows = flatten(
          newDatatables.map((dt, i) => {
            const byColumnValues = pick(originalDatatables[i].rows[0], args.by);
            return dt.rows.map((row) => ({
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
      columns.forEach((column) => {
        if (resultingColumns.find((resultingColumn) => resultingColumn.name === column.name)) {
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
  const errors = getFunctionErrors().ply;
  const [referenceTable] = datatableArray;
  const targetRowLength = referenceTable.rows.length;

  // Sanity check
  datatableArray.forEach((datatable) => {
    if (datatable.rows.length !== targetRowLength) {
      throw errors.rowCountMismatch();
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
