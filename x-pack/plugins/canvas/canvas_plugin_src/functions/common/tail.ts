/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeRight } from 'lodash';
import { ContextFunction, Datatable } from '../types';

interface Arguments {
  count: number;
}

export function tail(): ContextFunction<'tail', Datatable, Arguments, Datatable> {
  return {
    name: 'tail',
    aliases: [],
    type: 'datatable',
    help: 'Get the last N rows from the end of a datatable. Also see `head`',
    context: {
      types: ['datatable'],
    },
    args: {
      count: {
        aliases: ['_'],
        types: ['number'],
        help: 'Return this many rows from the end of the datatable',
      },
    },
    fn: (context, args) => ({
      ...context,
      rows: takeRight(context.rows, args.count),
    }),
  };
}
