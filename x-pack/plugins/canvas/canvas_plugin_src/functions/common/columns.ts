/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit, pick, find } from 'lodash';
import { ContextFunction, Datatable, DatatableColumn } from '../types';

interface Arguments {
  include: string | null;
  exclude: string | null;
}

export function columns(): ContextFunction<'columns', Datatable, Arguments, Datatable> {
  return {
    name: 'columns',
    type: 'datatable',
    help:
      'Include or exclude columns from a data table. If you specify both, this will exclude first',
    context: {
      types: ['datatable'],
    },
    args: {
      include: {
        types: ['string'],
        help: 'A comma separated list of column names to keep in the table',
        default: null,
      },
      exclude: {
        types: ['string'],
        help: 'A comma separated list of column names to remove from the table',
        default: null,
      },
    },
    fn: (context, args) => {
      const { include, exclude } = args;
      const { columns: contextColumns, rows: contextRows, ...rest } = context;
      let result = { ...context };

      if (exclude) {
        const fields = exclude.split(',').map(field => field.trim());
        const cols = contextColumns.filter(col => !fields.includes(col.name));
        const rows = cols.length > 0 ? contextRows.map(row => omit(row, fields)) : [];

        result = { rows, columns: cols, ...rest };
      }

      if (include) {
        const fields = include.split(',').map(field => field.trim());
        // const columns = result.columns.filter(col => fields.includes(col.name));

        // Include columns in the order the user specified
        const cols: DatatableColumn[] = [];

        fields.forEach(field => {
          const column = find(result.columns, { name: field });
          if (column) {
            cols.push(column);
          }
        });
        const rows = cols.length > 0 ? result.rows.map(row => pick(row, fields)) : [];
        result = { rows, columns: cols, ...rest };
      }

      return result;
    },
  };
}
