/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { exactly } from '../../../canvas_plugin_src/functions/common/exactly';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof exactly>> = {
  help: i18n.translate('xpack.canvas.functions.exactlyHelpText', {
    defaultMessage: 'Creates a filter that matches a given column to an exact value.',
  }),
  args: {
    column: i18n.translate('xpack.canvas.functions.exactly.args.columnHelpText', {
      defaultMessage: 'The column or field that you want to filter.',
    }),
    value: i18n.translate('xpack.canvas.functions.exactly.args.valueHelpText', {
      defaultMessage: 'The value to match exactly, including white space and capitalization.',
    }),
    filterGroup: i18n.translate('xpack.canvas.functions.exactly.args.filterGroupHelpText', {
      defaultMessage: 'The group name for the filter.',
    }),
  },
};
