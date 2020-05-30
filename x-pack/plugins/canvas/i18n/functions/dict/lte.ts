/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { lte } from '../../../canvas_plugin_src/functions/common/lte';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { CONTEXT } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof lte>> = {
  help: i18n.translate('xpack.canvas.functions.lteHelpText', {
    defaultMessage: 'Returns whether the {CONTEXT} is less than or equal to the argument.',
    values: {
      CONTEXT,
    },
  }),
  args: {
    value: i18n.translate('xpack.canvas.functions.lte.args.valueHelpText', {
      defaultMessage: 'The value compared to the {CONTEXT}.',
      values: {
        CONTEXT,
      },
    }),
  },
};
