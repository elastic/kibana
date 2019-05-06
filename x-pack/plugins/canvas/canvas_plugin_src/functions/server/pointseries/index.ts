/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore Untyped library
import uniqBy from 'lodash.uniqby';
// @ts-ignore Untyped Elastic library
import { evaluate } from 'tinymath';
import { groupBy, zipObject, omit, values } from 'lodash';
import moment from 'moment';
// @ts-ignore Untyped local
import { pivotObjectArray } from '../../../../common/lib/pivot_object_array';
// @ts-ignore Untyped local
import { unquoteString } from '../../../../common/lib/unquote_string';
// @ts-ignore Untyped local
import { isColumnReference } from './lib/is_column_reference';
// @ts-ignore Untyped local
import { getExpressionType } from './lib/get_expression_type';
import {
  ContextFunction,
  Datatable,
  DatatableRow,
  PointSeries,
  PointSeriesColumnName,
  PointSeriesColumns,
} from '../../types';

// TODO: pointseries performs poorly, that's why we run it on the server.

const columnExists = (cols: string[], colName: string): boolean =>
  cols.includes(unquoteString(colName));

function keysOf<T, K extends keyof T>(obj: T): K[] {
  return Object.keys(obj) as K[];
}

type Arguments = { [key in PointSeriesColumnName]: string | null };

export function pointseries(): ContextFunction<'pointseries', Datatable, Arguments, PointSeries> {
  return {
    name: 'pointseries',
    type: 'pointseries',
    help:
      'Turn a datatable into a point series model. Currently we differentiate measure from dimensions by looking for a [TinyMath function](https://www.elastic.co/guide/en/kibana/current/canvas-tinymath-functions.html). ' +
      'If you enter a TinyMath expression in your argument, we treat that argument as a measure, otherwise it is a dimension. Dimensions are combined to create unique ' +
      'keys. Measures are then deduplicated by those keys using the specified TinyMath function',
    context: {
      types: ['datatable'],
    },
    args: {
      x: {
        types: ['string', 'null'],
        help: 'The values along the X-axis',
      },
      y: {
        types: ['string', 'null'],
        help: 'The values along the y-axis',
      },
      color: {
        types: ['string', 'null'],
        help: "An expression to use in determining the mark's color", // If you need categorization, transform the field.
      },
      size: {
        types: ['string', 'null'],
        help: 'For elements that support it, the size of the marks',
      },
      text: {
        types: ['string', 'null'],
        help: 'For use in charts that support it, the text to show in the mark',
      },
      // In the future it may make sense to add things like shape, or tooltip values, but I think what we have is good for now
      // The way the function below is written you can add as many arbitrary named args as you want.
    },
    fn: (context, args) => {
      // Note: can't replace pivotObjectArray with datatableToMathContext, lose name of non-numeric columns
      const columnNames = context.columns.map(col => col.name);
      const mathScope = pivotObjectArray(context.rows, columnNames);
      const autoQuoteColumn = (col: string | null) => {
        if (!col || !columnNames.includes(col)) {
          return col;
        }

        return col.match(/\s/) ? `'${col}'` : col;
      };

      const measureNames: PointSeriesColumnName[] = [];
      const dimensions: Array<{ name: keyof Arguments; value: string }> = [];
      const columns = {} as PointSeriesColumns;

      // Separates args into dimensions and measures arrays
      // by checking if arg is a column reference (dimension)
      keysOf(args).forEach(argName => {
        const mathExp = autoQuoteColumn(args[argName]);

        if (mathExp != null && mathExp.trim() !== '') {
          const col = {
            type: '',
            role: '',
            expression: mathExp,
          };

          if (isColumnReference(mathExp)) {
            // TODO: Do something better if the column does not exist
            if (!columnExists(columnNames, mathExp)) {
              return;
            }

            dimensions.push({
              name: argName,
              value: mathExp,
            });
            col.type = getExpressionType(context.columns, mathExp);
            col.role = 'dimension';
          } else {
            measureNames.push(argName);
            col.type = 'number';
            col.role = 'measure';
          }

          // @ts-ignore untyped local: get_expression_type
          columns[argName] = col;
        }
      });

      const PRIMARY_KEY = '%%CANVAS_POINTSERIES_PRIMARY_KEY%%';
      const rows: DatatableRow[] = context.rows.map((row, i) => ({
        ...row,
        [PRIMARY_KEY]: i,
      }));

      function normalizeValue(expression: string, value: string) {
        switch (getExpressionType(context.columns, expression)) {
          case 'string':
            return String(value);
          case 'number':
            return Number(value);
          case 'date':
            return moment(value).valueOf();
          default:
            return value;
        }
      }

      // Dimensions
      // Group rows by their dimension values, using the argument values and preserving the PRIMARY_KEY
      // There's probably a better way to do this
      const results: DatatableRow = rows.reduce((rowAcc: DatatableRow, row, i) => {
        const newRow = dimensions.reduce(
          (acc: Record<string, string | number>, { name, value }) => {
            try {
              acc[name] = args[name]
                ? normalizeValue(value, evaluate(value, mathScope)[i])
                : '_all';
            } catch (e) {
              // TODO: handle invalid column names...
              // Do nothing if column does not exist
              // acc[dimension] = '_all';
            }
            return acc;
          },
          { [PRIMARY_KEY]: row[PRIMARY_KEY] }
        );

        return Object.assign(rowAcc, { [row[PRIMARY_KEY]]: newRow });
      }, {});

      // Measures
      // First group up all of the distinct dimensioned bits. Each of these will be reduced to just 1 value
      // for each measure
      const measureKeys = groupBy<DatatableRow>(rows, row =>
        dimensions
          .map(({ name }) => {
            const value = args[name];
            return value ? row[value] : '_all';
          })
          .join('::%BURLAP%::')
      );

      // Then compute that 1 value for each measure
      values<DatatableRow[]>(measureKeys).forEach(valueRows => {
        const subtable = { type: 'datatable', columns: context.columns, rows: valueRows };
        const subScope = pivotObjectArray(subtable.rows, subtable.columns.map(col => col.name));
        const measureValues = measureNames.map(measure => {
          try {
            const ev = evaluate(args[measure], subScope);
            if (Array.isArray(ev)) {
              throw new Error('Expressions must be wrapped in a function such as sum()');
            }

            return ev;
          } catch (e) {
            // TODO: don't catch if eval to Array
            return null;
          }
        });

        valueRows.forEach(row => {
          Object.assign(results[row[PRIMARY_KEY]], zipObject(measureNames, measureValues));
        });
      });

      // It only makes sense to uniq the rows in a point series as 2 values can not exist in the exact same place at the same time.
      const resultingRows = uniqBy(
        values(results).map(row => omit(row, PRIMARY_KEY)),
        JSON.stringify
      );

      return {
        type: 'pointseries',
        columns,
        rows: resultingRows,
      };
    },
  };
}
