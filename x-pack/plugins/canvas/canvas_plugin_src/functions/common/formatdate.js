/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';

export const formatdate = () => ({
  name: 'formatdate',
  type: 'string',
  help: i18n.translate('xpack.canvas.functions.formatDateHelpText', {
    defaultMessage: 'Output a ms since epoch number as a formatted string',
  }),
  context: {
    types: ['number'],
  },
  args: {
    format: {
      aliases: ['_'],
      types: ['string'],
      help: i18n.translate('xpack.canvas.functions.formatDate.argsFormatHelpText', {
        defaultMessage: 'MomentJS Format with which to bucket (See {momentjsFormatDateLink})',
        values: {
          momentjsFormatLink: 'https://momentjs.com/docs/#/displaying/',
        },
      }),
    },
  },
  fn: (context, args) => {
    if (!args.format) return moment.utc(new Date(context)).toISOString();
    return moment.utc(new Date(context)).format(args.format);
  },
});
