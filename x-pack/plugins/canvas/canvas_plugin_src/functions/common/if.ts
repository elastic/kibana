/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Function } from '../types';

interface Arguments {
  condition: boolean | null;
  then: () => Promise<any>;
  else: () => Promise<any>;
}

export function ifFn(): Function<'if', Arguments, any> {
  return {
    name: 'if',
    help: 'Perform conditional logic',
    args: {
      condition: {
        types: ['boolean', 'null'],
        aliases: ['_'],
        help:
          'A boolean true or false, usually returned by a subexpression. If this is not supplied then the input context will be used',
      },
      then: {
        resolve: false,
        help: 'The return value if true',
      },
      else: {
        resolve: false,
        help:
          'The return value if false. If else is not specified, and the condition is false' +
          'then the input context to the function will be returned',
      },
    },
    fn: async (context, args) => {
      if (args.condition) {
        if (typeof args.then === 'undefined') {
          return context;
        }
        return await args.then();
      } else {
        if (typeof args.else === 'undefined') {
          return context;
        }
        return await args.else();
      }
    },
  };
}
