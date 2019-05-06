/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { take } from 'lodash';
import { ContextFunction, Datatable } from '../types';

interface Arguments {
  count: number;
}

export function head(): ContextFunction<'head', Datatable, Arguments, Datatable> {
  return {
    name: 'head',
    aliases: [],
    type: 'datatable',
    help: 'Get the first N rows from the datatable. Also see `tail`',
    context: {
      types: ['datatable'],
    },
    args: {
      count: {
        aliases: ['_'],
        types: ['number'],
        help: 'Return this many rows from the beginning of the datatable',
        default: 1,
      },
    },
    fn: (context, args) => ({
      ...context,
      rows: take(context.rows, args.count),
    }),
  };
}
