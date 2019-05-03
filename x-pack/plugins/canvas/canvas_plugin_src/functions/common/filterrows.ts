/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Datatable, ContextFunction } from '../types';

interface Arguments {
  fn: (datatable: Datatable) => Promise<boolean>;
}

export function filterrows(): ContextFunction<
  'filterrows',
  Datatable,
  Arguments,
  Promise<Datatable>
> {
  return {
    name: 'filterrows',
    aliases: [],
    type: 'datatable',
    context: {
      types: ['datatable'],
    },
    help: 'Filter rows in a datatable based on the return value of a subexpression.',
    args: {
      fn: {
        resolve: false,
        aliases: ['_'],
        types: ['boolean'],
        help:
          'An expression to pass each rows in the datatable into. The expression should return a boolean. ' +
          'A true value will preserve the row, and a false value will remove it.',
      },
    },
    fn(context, { fn }) {
      const checks = context.rows.map(row =>
        fn({
          ...context,
          rows: [row],
        })
      );

      return Promise.all(checks)
        .then(results => context.rows.filter((row, i) => results[i]))
        .then(
          rows =>
            ({
              ...context,
              rows,
            } as Datatable)
        );
    },
  };
}
