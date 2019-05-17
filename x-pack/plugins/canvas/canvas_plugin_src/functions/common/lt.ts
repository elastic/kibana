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

export function lt(): ContextFunction<'lt', Context, Arguments, boolean> {
  const { help, args: argHelp } = getFunctionHelp().lt;

  return {
    name: 'lt',
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
      const { value } = args;

      if (typeof context !== typeof value) {
        return false;
      }

      // @ts-ignore #35433 This is a wonky comparison for nulls
      return context < value;
    },
  };
}
