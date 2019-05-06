/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Function } from '../types';

interface Arguments {
  value: Return;
}

type Return = boolean | number | string | null;

export function eq(): Function<'eq', Arguments, Return> {
  return {
    name: 'eq',
    type: 'boolean',
    help: 'Return if the context is equal to the argument',
    args: {
      value: {
        aliases: ['_'],
        types: ['boolean', 'number', 'string', 'null'],
        required: true,
        help: 'The value to compare the context to',
      },
    },
    fn: (context, args) => {
      return context === args.value;
    },
  };
}
