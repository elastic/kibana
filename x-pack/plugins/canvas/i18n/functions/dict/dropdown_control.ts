/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { dropdownControl } from '../../../canvas_plugin_src/functions/common/dropdownControl';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof dropdownControl>> = {
  help: i18n.translate('xpack.canvas.functions.dropdownControlHelpText', {
    defaultMessage: 'Configures a drop-down filter control element.',
  }),
  args: {
    filterColumn: i18n.translate(
      'xpack.canvas.functions.dropdownControl.args.filterColumnHelpText',
      {
        defaultMessage: 'The column or field that you want to filter.',
      }
    ),
    valueColumn: i18n.translate('xpack.canvas.functions.dropdownControl.args.valueColumnHelpText', {
      defaultMessage:
        'The column or field from which to extract the unique values for the drop-down control.',
    }),
    filterGroup: i18n.translate('xpack.canvas.functions.dropdownControl.args.filterGroupHelpText', {
      defaultMessage: 'The group name for the filter.',
    }),
  },
};
