/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { urlparam } from '../../../canvas_plugin_src/functions/browser/urlparam';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { TYPE_STRING, URL } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof urlparam>> = {
  help: i18n.translate('xpack.canvas.functions.urlparamHelpText', {
    defaultMessage:
      'Retreives a {URL} parameter to use in an expression. ' +
      'The {urlparamFn} function always returns a {TYPE_STRING}. ' +
      'For example, you can retrieve the value {value} from the parameter {myVar} from the {URL} {example}).',
    values: {
      example: 'https://localhost:5601/app/canvas?myVar=20',
      myVar: '`myVar`',
      TYPE_STRING,
      URL,
      urlparamFn: '`urlparam`',
      value: '`"20"`',
    },
  }),
  args: {
    param: i18n.translate('xpack.canvas.functions.urlparam.args.paramHelpText', {
      defaultMessage: 'The {URL} hash parameter to retrieve.',
      values: {
        URL,
      },
    }),
    default: i18n.translate('xpack.canvas.functions.urlparam.args.defaultHelpText', {
      defaultMessage: 'The string returned when the {URL} parameter is unspecified.',
      values: {
        URL,
      },
    }),
  },
};
