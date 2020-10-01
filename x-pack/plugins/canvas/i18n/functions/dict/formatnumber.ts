/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { formatnumber } from '../../../canvas_plugin_src/functions/common/formatnumber';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { NUMERALJS } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof formatnumber>> = {
  help: i18n.translate('xpack.canvas.functions.formatnumberHelpText', {
    defaultMessage: 'Formats a number into a formatted number string using the {NUMERALJS}.',
    values: {
      NUMERALJS,
    },
  }),
  args: {
    // TODO: Find a way to generate the docs URL here
    format: i18n.translate('xpack.canvas.functions.formatnumber.args.formatHelpText', {
      defaultMessage: 'A {NUMERALJS} format string. For example, {example1} or {example2}.',
      values: {
        example1: '`"0.0a"`',
        example2: '`"0%"`',
        NUMERALJS,
      },
    }),
  },
};
