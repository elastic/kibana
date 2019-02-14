/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const lt = () => ({
  name: 'lt',
  type: 'boolean',
  help: 'Return if the context is less than the argument',
  args: {
    value: {
      aliases: ['_'],
      types: ['boolean', 'number', 'string', 'null'],
      required: true,
      help: 'The value to compare the context to',
    },
  },
  fn: (context, args) => {
    if (typeof context !== typeof args.value) {
      return false;
    }
    return context < args.value;
  },
});
