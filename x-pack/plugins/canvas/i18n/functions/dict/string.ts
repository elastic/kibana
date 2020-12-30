/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { string } from '../../../canvas_plugin_src/functions/common/string';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof string>> = {
  help: i18n.translate('xpack.canvas.functions.stringHelpText', {
    defaultMessage: 'Concatenates all of the arguments into a single string.',
  }),
  args: {
    value: i18n.translate('xpack.canvas.functions.string.args.valueHelpText', {
      defaultMessage: 'The values to join together into one string. Include spaces where needed.',
    }),
  },
};
