/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, defer, of, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { groupBy, flatten, pick, map as _map, uniqWith } from 'lodash';
import { Datatable, DatatableColumn, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

interface Arguments {
  by?: string[];
  expression: Array<(datatable: Datatable) => Observable<Datatable>>;
}

type Output = Datatable | Observable<Datatable>;

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
        help: argHelp.by!,
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
    fn(input, args) {
      if (!args) {
        return input;
      }

      const byColumns =
        args.by?.map((by) => {
          const column = input.columns.find(({ name }) => name === by);

          if (!column) {
            throw errors.columnNotFound(by);
          }

          return column;
        }) ?? [];

      const originalDatatables = args.by
        ? Object.values(groupBy(input.rows, (row) => JSON.stringify(pick(row, args.by!)))).map(
            (rows) => ({ ...input, rows })
          )
        : [input];

      const datatables$ = originalDatatables.map((originalDatatable) =>
        combineLatest(
          args.expression?.map((expression) => defer(() => expression(originalDatatable))) ?? [
            of(originalDatatable),
          ]
        ).pipe(map(combineAcross))
      );

      return (datatables$.length ? combineLatest(datatables$) : of([])).pipe(
        map((newDatatables) => {
          // Here we're just merging each for the by splits, so it doesn't actually matter if the rows are the same length
          const columns = combineColumns([byColumns].concat(_map(newDatatables, 'columns')));
          const rows = flatten(
            newDatatables.map((datatable, index) =>
              datatable.rows.map((row) => ({
                ...pick(originalDatatables[index].rows[0], args.by!),
                ...row,
              }))
            )
          );

          return {
            ...input,
            rows,
            columns,
          } as Datatable;
        })
      );
    },
  };
}

function combineColumns(arrayOfColumnsArrays: DatatableColumn[][]) {
  return uniqWith(arrayOfColumnsArrays.flat(), ({ name: a }, { name: b }) => a === b);
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
  const arrayOfRowsArrays = _map(datatableArray, 'rows');
  const rows = [];
  for (let i = 0; i < targetRowLength; i++) {
    const rowsAcross = _map(arrayOfRowsArrays, i);

    // The reason for the Object.assign is that rowsAcross is an array
    // and those rows need to be applied as arguments to Object.assign
    rows.push(Object.assign({}, ...rowsAcross));
  }

  const columns = combineColumns(_map(datatableArray, 'columns'));

  return {
    type: 'datatable',
    rows,
    columns,
  };
}
