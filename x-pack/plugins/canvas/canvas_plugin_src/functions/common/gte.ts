/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FunctionFactory } from '../types';

type Value = boolean | number | string | null;

interface Arguments {
  value: Value;
}

export const gte: FunctionFactory<'gte', Value, Arguments, boolean> = () => ({
  name: 'gte',
  type: 'boolean',
  help: 'Return if the context is greater than or equal to the argument',
  args: {
    value: {
      aliases: ['_'],
      types: ['boolean', 'number', 'string', 'null'],
      required: true,
      help: 'The value to compare the context to',
    },
  },
  fn: (context, args) => {
    const { value } = args;

    if (typeof context !== typeof value) {
      return false;
    }

    return context && value ? context >= value : false;
  },
});
