/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';

export const rounddate = () => ({
  name: 'rounddate',
  type: 'number',
  help: i18n.translate('xpack.canvas.functions.rounddateHelpText', {
    defaultMessage: 'Round ms since epoch using a moment formatting string. Returns ms since epoch',
  }),
  context: {
    types: ['number'],
  },
  args: {
    format: {
      aliases: ['_'],
      types: ['string'],
      help: i18n.translate('xpack.canvas.functions.rounddate.args.formatHelpText', {
        defaultMessage:
          'MomentJS Format with which to bucket (See {momentjsFormatLink}). For example "{dateFormatExample}" would round to the month',
        values: {
          momentjsFormatLink: 'https://momentjs.com/docs/#/displaying/',
          dateFormatExample: 'YYYY-MM',
        },
      }),
    },
  },
  fn: (context, args) => {
    if (!args.format) return context;
    return moment.utc(moment.utc(context).format(args.format), args.format).valueOf();
  },
});
