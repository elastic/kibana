/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable, ExpressionFunctionDefinition, getType } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  id: string | null;
  name: string;
  expression: (datatable: Datatable) => Promise<boolean | number | string | null>;
}

export function mapColumn(): ExpressionFunctionDefinition<
  'mapColumn',
  Datatable,
  Arguments,
  Promise<Datatable>
> {
  const { help, args: argHelp } = getFunctionHelp().mapColumn;

  return {
    name: 'mapColumn',
    aliases: ['mc'], // midnight commander. So many times I've launched midnight commander instead of moving a file.
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
        types: ['string'],
        aliases: ['_', 'column'],
        help: argHelp.name,
        required: true,
      },
      expression: {
        types: ['boolean', 'number', 'string', 'null'],
        resolve: false,
        aliases: ['exp', 'fn', 'function'],
        help: argHelp.expression,
        required: true,
      },
    },
    fn: (input, args) => {
      const expression = args.expression || (() => Promise.resolve(null));
      const columnId = args.id != null ? args.id : args.name;
      const columns = [...input.columns];
      const rowPromises = input.rows.map((row) => {
        return expression({
          type: 'datatable',
          columns,
          rows: [row],
        }).then((val) => ({
          ...row,
          [columnId]: val,
        }));
      });

      return Promise.all(rowPromises).then((rows) => {
        const existingColumnIndex = columns.findIndex(({ name }) => name === args.name);
        const type = rows.length ? getType(rows[0][columnId]) : 'null';
        const newColumn = {
          id: columnId,
          name: args.name,
          meta: { type },
        };

        if (existingColumnIndex === -1) {
          columns.push(newColumn);
        } else {
          columns[existingColumnIndex] = newColumn;
        }

        return {
          type: 'datatable',
          columns,
          rows,
        } as Datatable;
      });
    },
  };
}
