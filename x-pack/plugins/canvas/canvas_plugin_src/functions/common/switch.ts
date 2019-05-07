/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Function, Case } from '../types';

interface Arguments {
  case: Array<() => Promise<Case>>;
  default: () => any;
}

export function switchFn(): Function<'switch', Arguments, any> {
  return {
    name: 'switch',
    help: 'Perform conditional logic with multiple conditions',
    args: {
      case: {
        types: ['case'],
        aliases: ['_'],
        resolve: false,
        multi: true,
        help: 'The list of conditions to check',
      },
      default: {
        aliases: ['finally'],
        resolve: false,
        help: 'The default case if no cases match',
      },
    },
    fn: async (context, args) => {
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

      return context;
    },
  };
}
