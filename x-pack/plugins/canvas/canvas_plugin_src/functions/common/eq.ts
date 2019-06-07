/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  value: Return;
}

type Return = boolean | number | string | null;

export function eq(): ExpressionFunction<'eq', any, Arguments, Return> {
  const { help, args: argHelp } = getFunctionHelp().eq;

  return {
    name: 'eq',
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
      return context === args.value;
    },
  };
}
