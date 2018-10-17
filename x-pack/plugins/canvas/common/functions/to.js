/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { castProvider } from '../interpreter/cast';

export const to = () => ({
  name: 'to',
  aliases: [],
  help: i18n.translate('xpack.canvas.functions.toHelpText', {
    defaultMessage: 'Explicitly cast from one type to another',
  }),
  context: {},
  args: {
    type: {
      types: ['string'],
      help: i18n.translate('xpack.canvas.functions.toTypeHelpText', {
        defaultMessage: 'A known type',
      }),
      aliases: ['_'],
      multi: true,
    },
  },
  fn: (context, args, { types }) => {
    if (!args.type) {
      throw new Error(
        i18n.translate('xpack.canvas.functions.to.castingTypeIsNotSpecifiedErrorMessage', {
          defaultMessage: 'Must specify a casting type',
        })
      );
    }

    return castProvider(types)(context, args.type);
  },
});
