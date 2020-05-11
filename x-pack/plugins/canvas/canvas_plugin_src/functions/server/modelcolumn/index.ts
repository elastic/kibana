/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore Untyped library
import uniqBy from 'lodash.uniqby';
// @ts-ignore Untyped Elastic library
import { evaluate } from 'tinymath';
import { groupBy, zipObject, omit } from 'lodash';
import moment from 'moment';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import {
  Datatable,
  DatatableRow,
  PointSeries,
  PointSeriesColumnName,
  PointSeriesColumns,
} from 'src/plugins/expressions/common';
// @ts-ignore Untyped local
import { pivotObjectArray } from '../../../../common/lib/pivot_object_array';
// @ts-ignore Untyped local
import { unquoteString } from '../../../../common/lib/unquote_string';
// @ts-ignore Untyped local
import { isColumnReference } from './lib/is_column_reference';
// @ts-ignore Untyped local
import { getExpressionType } from './lib/get_expression_type';
import { getFunctionHelp, getFunctionErrors } from '../../../../i18n';

// TODO: pointseries performs poorly, that's why we run it on the server.

const columnExists = (cols: string[], colName: string): boolean =>
  cols.includes(unquoteString(colName));

function keysOf<T, K extends keyof T>(obj: T): K[] {
  return Object.keys(obj) as K[];
}

type Arguments = { [key in PointSeriesColumnName]: string | null };

export function modelcolumn(): ExpressionFunctionDefinition<'model_column', Datatable, any, any> {
  const { help, args: argHelp } = getFunctionHelp().pointseries;

  return {
    name: 'model_column',
    type: 'datatable',
    context: {
      types: ['datatable'],
    },
    help,
    args: {
      column: {
        types: ['modelcolumnarg'],
        multi: true,
      },
      // In the future it may make sense to add things like shape, or tooltip values, but I think what we have is good for now
      // The way the function below is written you can add as many arbitrary named args as you want.
    },
    fn: (input, args) => {
      console.log(args)
      console.log(args.column)
      const newColumns = input.columns
        .filter(datatableColumn =>
          args.column.some(argColumn => argColumn.column === datatableColumn.id)
        )
        .map(datatableColumn => ({
          ...datatableColumn,
          type:
            datatableColumn.type ||
            (
              args.column.find(argColumn => argColumn.column === datatableColumn.id) || {
                dataType: 'string',
              }
            ).dataType,
        }));
      return {
        type: 'datatable',
        columns: newColumns,
        rows: input.rows,
      };
    },
  };
}

export function modelcolumnarg(): any {
  return {
    name: 'modelcolumnarg',
    type: 'modelcolumnarg',
    context: {
      types: [],
    },
    help: '',
    args: {
      column: {
        types: ['string'],
      },
      dataType: {
        types: ['string'],
      },
    },
    fn: (_,args) => {
      return {
        type: 'modelcolumnarg',
        column: args.column,
        dataType: args.dataType,
      };
    },
  };
}
