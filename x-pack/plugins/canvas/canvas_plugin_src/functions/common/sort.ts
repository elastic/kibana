/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import { ContextFunction, Datatable } from '../types';

interface Arguments {
  by: string;
  reverse: boolean;
}

export function sort(): ContextFunction<'sort', Datatable, Arguments, Datatable> {
  return {
    name: 'sort',
    type: 'datatable',
    help: 'Sorts a datatable on a column',
    context: {
      types: ['datatable'],
    },
    args: {
      by: {
        types: ['string'],
        aliases: ['_', 'column'],
        multi: false, // TODO: No reason you couldn't.
        help:
          'The column to sort on. If column is not specified, the datatable will be sorted on the first column.',
      },
      reverse: {
        types: ['boolean'],
        help:
          'Reverse the sort order. If reverse is not specified, the datatable will be sorted in ascending order.',
        options: [true, false],
      },
    },
    fn: (context, args) => {
      const column = args.by || context.columns[0].name;

      return {
        ...context,
        rows: args.reverse ? sortBy(context.rows, column).reverse() : sortBy(context.rows, column),
      };
    },
  };
}
