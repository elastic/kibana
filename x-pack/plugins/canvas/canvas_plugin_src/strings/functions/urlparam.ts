/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { urlparam } from '../../functions/browser/urlparam';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof urlparam>> = {
  help: i18n.translate('xpack.canvas.functions.urlparamHelpText', {
    defaultMessage:
      'Access URL parameters and use them in expressions. Eg https://localhost:5601/app/canvas?myVar=20. This will always return a string',
  }),
  args: {
    param: i18n.translate('xpack.canvas.functions.urlparam.args.paramHelpText', {
      defaultMessage: 'The URL hash parameter to access',
    }),
    default: i18n.translate('xpack.canvas.functions.urlparam.args.defaultHelpText', {
      defaultMessage: 'Return this string if the url parameter is not defined',
    }),
  },
};
