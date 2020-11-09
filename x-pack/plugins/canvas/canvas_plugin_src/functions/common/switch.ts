/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { Case } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  case: Array<() => Promise<Case>>;
  default: () => any;
}

export function switchFn(): ExpressionFunctionDefinition<'switch', unknown, Arguments, unknown> {
  const { help, args: argHelp } = getFunctionHelp().switch;

  return {
    name: 'switch',
    help,
    args: {
      case: {
        types: ['case'],
        aliases: ['_'],
        resolve: false,
        multi: true,
        required: true,
        help: argHelp.case,
      },
      default: {
        aliases: ['finally'],
        resolve: false,
        help: argHelp.default,
      },
    },
    fn: async (input, args) => {
      const cases = args.case || [];

      for (let i = 0; i < cases.length; i++) {
        const { matches, result } = await cases[i]();

        if (matches) {
          return result;
        }
      }

      if (typeof args.default !== 'undefined') {
        return await args.default();
      }

      return input;
    },
  };
}
