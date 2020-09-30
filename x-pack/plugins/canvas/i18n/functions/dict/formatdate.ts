/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { formatdate } from '../../../canvas_plugin_src/functions/common/formatdate';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { ISO8601, MOMENTJS } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof formatdate>> = {
  help: i18n.translate('xpack.canvas.functions.formatdateHelpText', {
    defaultMessage:
      'Formats an {ISO8601} date string or a date in milliseconds since epoch using {MOMENTJS}. See {url}.',
    values: {
      ISO8601,
      MOMENTJS,
      url: 'https://momentjs.com/docs/#/displaying/',
    },
  }),
  args: {
    format: i18n.translate('xpack.canvas.functions.formatdate.args.formatHelpText', {
      defaultMessage: 'A {MOMENTJS} format. For example, {example}. See {url}.',
      values: {
        MOMENTJS,
        example: '`"MM/DD/YYYY"`',
        url: 'https://momentjs.com/docs/#/displaying/',
      },
    }),
  },
};
