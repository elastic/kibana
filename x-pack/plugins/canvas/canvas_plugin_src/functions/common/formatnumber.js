/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';

export const formatnumber = () => ({
  name: 'formatnumber',
  type: 'string',
  help: i18n.translate('xpack.canvas.functions.formatNumberHelpText', {
    defaultMessage: 'Turn a number into a string using a NumberJS format',
  }),
  context: {
    types: ['number'],
  },
  args: {
    format: {
      aliases: ['_'],
      types: ['string'],
      help: i18n.translate('xpack.canvas.functions.formatNumber.argsFormatHelpText', {
        defaultMessage: 'NumeralJS format string {numeraljsFormatLink}',
        values: {
          numeraljsFormatLink: 'http://numeraljs.com/#format',
        },
      }),
    },
  },
  fn: (context, args) => {
    if (!args.format) return String(context);
    return numeral(context).format(args.format);
  },
});
