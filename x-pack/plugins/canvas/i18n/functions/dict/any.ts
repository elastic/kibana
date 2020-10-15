/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { any } from '../../../canvas_plugin_src/functions/common/any';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { BOOLEAN_TRUE } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof any>> = {
  help: i18n.translate('xpack.canvas.functions.anyHelpText', {
    defaultMessage:
      'Returns {BOOLEAN_TRUE} if at least one of the conditions is met. See also {all_fn}.',
    values: {
      all_fn: '`all`',
      BOOLEAN_TRUE,
    },
  }),
  args: {
    condition: i18n.translate('xpack.canvas.functions.any.args.conditionHelpText', {
      defaultMessage: 'The conditions to check.',
    }),
  },
};
