/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore untyped Elastic library
import { getType } from '@kbn/interpreter/common';
import { ContextFunction, Datatable } from '../types';

interface Arguments {
  name: string;
  expression: (datatable: Datatable) => Promise<boolean | number | string | null>;
}

export function mapColumn(): ContextFunction<
  'mapColumn',
  Datatable,
  Arguments,
  Promise<Datatable>
> {
  return {
    name: 'mapColumn',
    aliases: ['mc'], // midnight commander. So many times I've launched midnight commander instead of moving a file.
    type: 'datatable',
    help: 'Add a column calculated as the result of other columns, or not',
    context: {
      types: ['datatable'],
    },
    args: {
      name: {
        types: ['string'],
        aliases: ['_', 'column'],
        help: 'The name of the resulting column',
        required: true,
      },
      expression: {
        types: ['boolean', 'number', 'string', 'null'],
        resolve: false,
        aliases: ['exp', 'fn'],
        help: 'A canvas expression which will be passed each row as a single row datatable',
      },
    },
    fn: (context, args) => {
      const expression = args.expression || (() => Promise.resolve(null));

      const columns = [...context.columns];
      const rowPromises = context.rows.map(row => {
        return expression({
          type: 'datatable',
          columns,
          rows: [row],
        }).then(val => ({
          ...row,
          [args.name]: val,
        }));
      });

      return Promise.all(rowPromises).then(rows => {
        const existingColumnIndex = columns.findIndex(({ name }) => name === args.name);
        const type = rows.length ? getType(rows[0][args.name]) : 'null';
        const newColumn = { name: args.name, type };

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
