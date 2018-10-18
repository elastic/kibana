/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const eq = () => ({
  name: 'eq',
  type: 'boolean',
  help: i18n.translate('xpack.canvas.functions.eqHelpText', {
    defaultMessage: 'Return if the context is equal to the argument',
  }),
  args: {
    value: {
      aliases: ['_'],
      types: ['boolean', 'number', 'string', 'null'],
      required: true,
      help: i18n.translate('xpack.canvas.functions.eq.args.valueHelpText', {
        defaultMessage: 'The value to compare the context to',
      }),
    },
  },
  fn: (context, args) => {
    return context === args.value;
  },
});
