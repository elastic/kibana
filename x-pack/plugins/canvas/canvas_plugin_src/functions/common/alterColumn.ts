/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { Datatable } from 'src/plugins/expressions/common';
import { DatatableColumn, DatatableColumnType, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

interface Arguments {
  column: string;
  type: DatatableColumnType | null;
  name: string;
}

export function alterColumn(): ExpressionFunctionDefinition<
  'alterColumn',
  Datatable,
  Arguments,
  Datatable
> {
  const { help, args: argHelp } = getFunctionHelp().alterColumn;
  const errors = getFunctionErrors().alterColumn;

  return {
    name: 'alterColumn',
    type: 'datatable',
    inputTypes: ['datatable'],
    help,
    args: {
      column: {
        aliases: ['_'],
        types: ['string'],
        required: true,
        help: argHelp.column,
      },
      name: {
        types: ['string'],
        help: argHelp.name,
      },
      type: {
        types: ['string'],
        help: argHelp.type,
        options: ['null', 'boolean', 'number', 'string', 'date'],
      },
    },
    fn: (input, args) => {
      if (!args.column || (!args.type && !args.name)) {
        return input;
      }

      let column = input.columns.find((col) => col.id === args.column);
      if (!column) {
        column = input.columns.find((col) => col.name === args.column);
      }

      if (!column) {
        throw errors.columnNotFound(args.column);
      }

      const name = args.name ?? column.name;
      const id = column.id ?? name;
      const prevColumnId = column.id ?? column.name;
      const type = args.type || column.meta.type;
      const meta = { ...column.meta, params: { ...(column.meta.params ?? {}), id: type }, type };

      const columns = input.columns.reduce((all: DatatableColumn[], col) => {
        if (col.name !== args.name && (col.id === column.id || col.name === column.name)) {
          return [...all, { ...col, name, id, meta }];
        }
        return [...all, col];
      }, []);

      let handler = (val: any) => val;

      if (args.type) {
        handler = (function getHandler() {
          switch (type) {
            case 'string':
              if (column.meta.type === 'date') {
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
              throw errors.cannotConvertType(type);
          }
        })();
      }

      const rows = input.rows.map((row) => ({
        ...omit(row, prevColumnId),
        [id]: handler(row[prevColumnId]),
      }));

      return {
        type: 'datatable',
        columns,
        rows,
      };
    },
  };
}
