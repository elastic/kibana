/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { formatnumber } from '../../functions/common/formatnumber';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof formatnumber>> = {
  help: i18n.translate('xpack.canvas.functions.formatnumberHelpText', {
    defaultMessage: 'Format a `number` into a formatted `string` using {numeralJS}. See {url}.',
    values: {
      numeralJS: 'NumeralJS',
      url: 'http://numeraljs.com/#format',
    },
  }),
  args: {
    format: i18n.translate('xpack.canvas.functions.formatnumber.args.formatHelpText', {
      defaultMessage: 'A {numeralJS} format string. For example, `"0.0a"` or `"0%"` See {url}.',
      values: {
        numeralJS: 'NumeralJS',
        url: 'http://numeraljs.com/#format',
      },
    }),
  },
};
