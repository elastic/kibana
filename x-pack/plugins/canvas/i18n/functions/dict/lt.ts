/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { lt } from '../../../canvas_plugin_src/functions/common/lt';
import { FunctionFactory } from '../../../types';
import { CONTEXT } from '../../constants';
import { FunctionHelp } from '../function_help';

export const help: FunctionHelp<FunctionFactory<typeof lt>> = {
  help: i18n.translate('xpack.canvas.functions.ltHelpText', {
    defaultMessage: 'Returns whether the {CONTEXT} is less than the argument.',
    values: {
      CONTEXT,
    },
  }),
  args: {
    value: i18n.translate('xpack.canvas.functions.lt.args.valueHelpText', {
      defaultMessage: 'The value compared to the {CONTEXT}.',
      values: {
        CONTEXT,
      },
    }),
  },
};
