/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const any = () => ({
  name: 'any',
  type: 'boolean',
  help: i18n.translate('xpack.canvas.functions.anyHelpText', {
    defaultMessage: 'Return true if any of the conditions are true',
  }),
  args: {
    condition: {
      aliases: ['_'],
      types: ['boolean', 'null'],
      required: true,
      multi: true,
      help: i18n.translate('xpack.canvas.functions.any.args.conditionHelpText', {
        defaultMessage: 'One or more conditions to check',
      }),
    },
  },
  fn: (context, args) => {
    const conditions = args.condition || [];
    return conditions.some(Boolean);
  },
});
