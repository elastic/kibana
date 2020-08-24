/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  condition: boolean | null;
  then: () => Promise<any>;
  else: () => Promise<any>;
}

export function ifFn(): ExpressionFunctionDefinition<'if', unknown, Arguments, unknown> {
  const { help, args: argHelp } = getFunctionHelp().if;

  return {
    name: 'if',
    help,
    args: {
      condition: {
        types: ['boolean'],
        aliases: ['_'],
        help: argHelp.condition,
        required: true,
      },
      then: {
        resolve: false,
        help: argHelp.then,
      },
      else: {
        resolve: false,
        help: argHelp.else,
      },
    },
    fn: async (input, args) => {
      if (args.condition) {
        if (typeof args.then === 'undefined') {
          return input;
        }
        return await args.then();
      } else {
        if (typeof args.else === 'undefined') {
          return input;
        }
        return await args.else();
      }
    },
  };
}
