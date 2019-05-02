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
  value: string | number | boolean | null;
}

export function staticColumn(): ContextFunction<'staticColumn', Datatable, Arguments, Datatable> {
  return {
    name: 'staticColumn',
    type: 'datatable',
    help: 'Add a column with a static value',
    context: {
      types: ['datatable'],
    },
    args: {
      name: {
        types: ['string'],
        aliases: ['_', 'column'],
        help: 'The name of the new column column',
        required: true,
      },
      value: {
        types: ['string', 'number', 'boolean', 'null'],
        help:
          'The value to insert in each column. Tip: use a sub-expression to rollup other columns into a static value',
        default: null,
      },
    },
    fn: (context, args) => {
      const rows = context.rows.map(row => ({ ...row, [args.name]: args.value }));
      const type = getType(args.value);
      const columns = [...context.columns];
      const existingColumnIndex = columns.findIndex(({ name }) => name === args.name);
      const newColumn = { name: args.name, type };

      if (existingColumnIndex > -1) {
        columns[existingColumnIndex] = newColumn;
      } else {
        columns.push(newColumn);
      }

      return {
        type: 'datatable',
        columns,
        rows,
      };
    },
  };
}
