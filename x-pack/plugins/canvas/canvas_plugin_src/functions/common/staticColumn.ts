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
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

interface Arguments {
  id: string | null;
  name: string | null;
  value: string | number | boolean | null;
}

export function staticColumn(): ExpressionFunctionDefinition<
  'staticColumn',
  Datatable,
  Arguments,
  Datatable
> {
  const { help, args: argHelp } = getFunctionHelp().staticColumn;
  const errors = getFunctionErrors().staticColumn;

  return {
    name: 'staticColumn',
    type: 'datatable',
    inputTypes: ['datatable'],
    help,
    args: {
      id: {
        types: ['string', 'null'],
        help: argHelp.id,
        required: false,
        default: null,
      },
      name: {
        types: ['string', 'null'],
        aliases: ['_', 'column'],
        help: argHelp.name,
        required: false,
        default: null,
      },
      value: {
        types: ['string', 'number', 'boolean', 'null'],
        help: argHelp.value,
        default: null,
      },
    },
    fn: (input, args) => {
      if ((args.id === null || args.id === '') && (args.name === null || args.name === '')) {
        throw errors.invalidIdAndNameArguments();
      }

      const columnIndex = input.columns.findIndex(({ id, name }) =>
        args.id ? id === args.id : name === args.name
      );

      const type = getType(args.value) as DatatableColumnType;

      if (columnIndex === -1) {
        const id = (args.id ?? args.name) as string;
        const rows = input.rows.map((row) => ({ ...row, [id]: args.value }));
        const newColumn = { id, name: args.name ?? id, meta: { type } };

        return { type: 'datatable', columns: [...input.columns, newColumn], rows };
      }

      const { id, name, meta } = input.columns[columnIndex];
      const columnId = id ?? args.name ?? name;
      const rows = input.rows.map((row) => ({ ...row, [columnId]: args.value }));
      const newColumn = {
        id: columnId,
        name: args.name ?? name,
        meta: { ...meta, params: { ...(meta.params ?? {}), id: type }, type },
      };

      const columns = [...input.columns];
      columns.splice(columnIndex, 1, newColumn);

      return { type: 'datatable', columns, rows };
    },
  };
}
