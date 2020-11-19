/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { gte } from '../../../canvas_plugin_src/functions/common/gte';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { CONTEXT } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof gte>> = {
  help: i18n.translate('xpack.canvas.functions.gteHelpText', {
    defaultMessage: 'Returns whether the {CONTEXT} is greater or equal to the argument.',
    values: {
      CONTEXT,
    },
  }),
  args: {
    value: i18n.translate('xpack.canvas.functions.gte.args.valueHelpText', {
      defaultMessage: 'The value compared to the {CONTEXT}.',
      values: {
        CONTEXT,
      },
    }),
  },
};
