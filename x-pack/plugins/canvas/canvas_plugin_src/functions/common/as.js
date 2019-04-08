/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getType } from '@kbn/interpreter/common';

export const asFn = () => ({
  name: 'as',
  type: 'datatable',
  context: {
    types: ['string', 'boolean', 'number', 'null'],
  },
  help: 'Creates a datatable with a single value',
  args: {
    name: {
      types: ['string'],
      aliases: ['_'],
      help: 'A name to give the column',
      default: 'value',
    },
  },
  fn: (context, args) => {
    return {
      type: 'datatable',
      columns: [
        {
          name: args.name,
          type: getType(context),
        },
      ],
      rows: [
        {
          [args.name]: context,
        },
      ],
    };
  },
});
