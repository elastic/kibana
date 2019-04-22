/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FunctionFactory } from '../types';

interface Arguments {
  condition: boolean[] | null;
}

export const any: FunctionFactory<'any', void, Arguments, boolean> = () => ({
  name: 'any',
  type: 'boolean',
  help: 'Return true if any of the conditions are true',
  args: {
    condition: {
      aliases: ['_'],
      types: ['boolean', 'null'],
      required: true,
      multi: true,
      help: 'One or more conditions to check',
    },
  },
  fn: (_context, args) => {
    const conditions = args.condition || [];
    return conditions.some(Boolean);
  },
});
