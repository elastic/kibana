/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'url';
import { i18n } from '@kbn/i18n';

export const urlparam = () => ({
  name: 'urlparam',
  aliases: [],
  type: 'string',
  help: i18n.translate('xpack.canvas.functions.urlparamHelpText', {
    defaultMessage:
      'Access URL parameters and use them in expressions. Eg {canvasLocalhostLink}. This will always return a string',
    values: {
      canvasLocalhostLink: 'https://localhost:5601/app/canvas?myVar=20',
    },
  }),
  context: {
    types: ['null'],
  },
  args: {
    param: {
      types: ['string'],
      aliases: ['_', 'var', 'variable'],
      help: i18n.translate('xpack.canvas.functions.urlparam.args.paramHelpText', {
        defaultMessage: 'The URL hash parameter to access',
      }),
      multi: false,
    },
    default: {
      types: ['string'],
      default: '""',
      help: i18n.translate('xpack.canvas.functions.urlparam.args.defaultHelpText', {
        defaultMessage: 'Return this string if the url parameter is not defined',
      }),
    },
  },
  fn: (context, args) => {
    const query = parse(window.location.href, true).query;
    return query[args.param] || args.default;
  },
});
