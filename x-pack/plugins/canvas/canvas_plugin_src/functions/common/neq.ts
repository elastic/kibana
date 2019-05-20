/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ContextFunction } from '../types';
import { getFunctionHelp } from '../../strings';

type Context = boolean | number | string | null;

interface Arguments {
  value: Context;
}

export function neq(): ContextFunction<'neq', Context, Arguments, boolean> {
  const { help, args: argHelp } = getFunctionHelp().neq;

  return {
    name: 'neq',
    type: 'boolean',
    help,
    args: {
      value: {
        aliases: ['_'],
        types: ['boolean', 'number', 'string', 'null'],
        required: true,
        help: argHelp.value,
      },
    },
    fn: (context, args) => {
      return context !== args.value;
    },
  };
}
