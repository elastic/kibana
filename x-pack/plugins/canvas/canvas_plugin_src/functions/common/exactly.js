/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const exactly = () => ({
  name: 'exactly',
  aliases: [],
  type: 'filter',
  context: {
    types: ['filter'],
  },
  help: i18n.translate('xpack.canvas.functions.exactlyHelpText', {
    defaultMessage: 'Create a filter that matches a given column for a perfectly exact value',
  }),
  args: {
    column: {
      types: ['string'],
      aliases: ['field', 'c'],
      help: i18n.translate('xpack.canvas.functions.exactly.args.columnHelpText', {
        defaultMessage: 'The column or field to attach the filter to',
      }),
    },
    value: {
      types: ['string'],
      aliases: ['v', 'val'],
      help: i18n.translate('xpack.canvas.functions.exactly.args.valueHelpText', {
        defaultMessage: 'The value to match exactly, including white space and capitalization',
      }),
    },
  },
  fn: (context, args) => {
    const { value, column } = args;

    const filter = {
      type: 'exactly',
      value,
      column,
    };

    return { ...context, and: [...context.and, filter] };
  },
});
