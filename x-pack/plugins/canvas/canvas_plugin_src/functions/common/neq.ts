/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { getFunctionHelp } from '../../../i18n';

type Input = boolean | number | string | null;

interface Arguments {
  value: Input;
}

export function neq(): ExpressionFunctionDefinition<'neq', Input, Arguments, boolean> {
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
    fn: (input, args) => {
      return input !== args.value;
    },
  };
}
