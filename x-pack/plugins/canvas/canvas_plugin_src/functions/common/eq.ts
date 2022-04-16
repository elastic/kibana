/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  value: Input;
}

type Input = boolean | number | string | null;

export function eq(): ExpressionFunctionDefinition<'eq', Input, Arguments, boolean> {
  const { help, args: argHelp } = getFunctionHelp().eq;

  return {
    name: 'eq',
    type: 'boolean',
    inputTypes: ['boolean', 'number', 'string', 'null'],
    help,
    args: {
      value: {
        aliases: ['_'],
        types: ['boolean', 'number', 'string', 'null'],
        required: true,
        help: argHelp.value,
      },
    },
    fn: (input, args) => {
      return input === args.value;
    },
  };
}
