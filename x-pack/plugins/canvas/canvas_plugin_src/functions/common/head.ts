/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { take } from 'lodash';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { Datatable } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  count: number;
}

export function head(): ExpressionFunction<'head', Datatable, Arguments, Datatable> {
  const { help, args: argHelp } = getFunctionHelp().head;

  return {
    name: 'head',
    aliases: [],
    type: 'datatable',
    help,
    context: {
      types: ['datatable'],
    },
    args: {
      count: {
        aliases: ['_'],
        types: ['number'],
        help: argHelp.count,
        default: 1,
      },
    },
    fn: (context, args) => ({
      ...context,
      rows: take(context.rows, args.count),
    }),
  };
}
