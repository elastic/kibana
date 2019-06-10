/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { Datatable } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  by: string;
  reverse: boolean;
}

export function sort(): ExpressionFunction<'sort', Datatable, Arguments, Datatable> {
  const { help, args: argHelp } = getFunctionHelp().sort;

  return {
    name: 'sort',
    type: 'datatable',
    help,
    context: {
      types: ['datatable'],
    },
    args: {
      by: {
        types: ['string'],
        aliases: ['_', 'column'],
        multi: false, // TODO: No reason you couldn't.
        help: argHelp.by,
      },
      reverse: {
        types: ['boolean'],
        help: argHelp.reverse,
        options: [true, false],
        default: false,
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
