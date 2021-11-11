/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getType } from '@kbn/interpreter/common';
import {
  ExpressionFunctionDefinition,
  Datatable,
  DatatableColumnType,
} from 'src/plugins/expressions/common';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  name: string;
  value: string | number | boolean | null;
}

export function staticColumn(): ExpressionFunctionDefinition<
  'staticColumn',
  Datatable,
  Arguments,
  Datatable
> {
  const { help, args: argHelp } = getFunctionHelp().staticColumn;

  return {
    name: 'staticColumn',
    type: 'datatable',
    inputTypes: ['datatable'],
    help,
    args: {
      name: {
        types: ['string'],
        aliases: ['_', 'column'],
        help: argHelp.name,
        required: true,
      },
      value: {
        types: ['string', 'number', 'boolean', 'null'],
        help: argHelp.value,
        default: null,
      },
    },
    fn: (input, args) => {
      const columnIndex = input.columns.findIndex((column) => column.name === args.name);
      const type = getType(args.value) as DatatableColumnType;

      if (columnIndex === -1) {
        const rows = input.rows.map((row) => ({ ...row, [args.name]: args.value }));
        const newColumn = { id: args.name, name: args.name, meta: { type } };

        return { type: 'datatable', columns: [...input.columns, newColumn], rows };
      }

      const { id, meta } = input.columns[columnIndex];
      const rows = input.rows.map((row) => ({ ...row, [id]: args.value }));
      const newColumn = {
        id,
        name: args.name,
        meta: { ...meta, params: { ...(meta.params ?? {}), id: type }, type },
      };

      const columns = [...input.columns];
      columns.splice(columnIndex, 1, newColumn);

      return { type: 'datatable', columns, rows };
    },
  };
}
