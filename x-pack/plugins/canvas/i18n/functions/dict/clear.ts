/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { clear } from '../../../canvas_plugin_src/functions/common/clear';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { CONTEXT, TYPE_NULL } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof clear>> = {
  help: i18n.translate('xpack.canvas.functions.clearHelpText', {
    defaultMessage: 'Clears the {CONTEXT}, and returns {TYPE_NULL}.',
    values: {
      CONTEXT,
      TYPE_NULL,
    },
  }),
  args: {},
};
