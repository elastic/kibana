/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import { ContextFunction, Datatable, DatatableColumn, DatatableColumnType } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  column: string;
  type: DatatableColumnType | null;
  name: string | null;
}

export function alterColumn(): ContextFunction<'alterColumn', Datatable, Arguments, Datatable> {
  const { help, args: argHelp } = getFunctionHelp().alterColumn;

  return {
    name: 'alterColumn',
    type: 'datatable',
    help,
    context: {
      types: ['datatable'],
    },
    args: {
      column: {
        aliases: ['_'],
        types: ['string'],
        help: argHelp.column,
      },
      type: {
        types: ['string'],
        help: argHelp.type,
        default: null,
        options: ['null', 'boolean', 'number', 'string'],
      },
      name: {
        types: ['string', 'null'],
        help: argHelp.name,
        default: null,
      },
    },
    fn: (context, args) => {
      if (!args.column || (!args.type && !args.name)) {
        return context;
      }

      const column = context.columns.find(col => col.name === args.column);
      if (!column) {
        throw new Error(`Column not found: '${args.column}'`);
      }

      const name = args.name || column.name;
      const type = args.type || column.type;

      const columns = context.columns.reduce((all: DatatableColumn[], col) => {
        if (col.name !== args.name) {
          if (col.name !== column.name) {
            all.push(col);
          } else {
            all.push({ name, type });
          }
        }
        return all;
      }, []);

      let handler = (val: any) => val;

      if (args.type) {
        handler = (function getHandler() {
          switch (type) {
            case 'string':
              if (column.type === 'date') {
                return (v: string) => new Date(v).toISOString();
              }
              return String;
            case 'number':
              return Number;
            case 'date':
              return (v: Date) => new Date(v).valueOf();
            case 'boolean':
              return Boolean;
            case 'null':
              return () => null;
            default:
              throw new Error(`Cannot convert to '${type}'`);
          }
        })();
      }

      const rows = context.rows.map(row => ({
        ...omit(row, column.name),
        [name]: handler(row[column.name]),
      }));

      return {
        type: 'datatable',
        columns,
        rows,
      };
    },
  };
}
