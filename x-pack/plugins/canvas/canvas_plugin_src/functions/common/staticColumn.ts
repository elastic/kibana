/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getType } from '@kbn/interpreter';
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
      const rows = input.rows.map((row) => ({ ...row, [args.name]: args.value }));
      const type = getType(args.value) as DatatableColumnType;
      const columns = [...input.columns];
      const existingColumnIndex = columns.findIndex(({ name }) => name === args.name);
      const newColumn = { id: args.name, name: args.name, meta: { type } };

      if (existingColumnIndex > -1) {
        columns[existingColumnIndex] = newColumn;
      } else {
        columns.push(newColumn);
      }

      return {
        ...input,
        columns,
        rows,
      };
    },
  };
}
