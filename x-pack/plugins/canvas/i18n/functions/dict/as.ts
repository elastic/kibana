/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { asFn } from '../../../canvas_plugin_src/functions/common/as';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { DATATABLE } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof asFn>> = {
  help: i18n.translate('xpack.canvas.functions.asHelpText', {
    defaultMessage: 'Creates a {DATATABLE} with a single value. See also {getCellFn}.',
    values: {
      DATATABLE,
      getCellFn: '`getCell`',
    },
  }),
  args: {
    name: i18n.translate('xpack.canvas.functions.as.args.nameHelpText', {
      defaultMessage: 'A name to give the column.',
    }),
  },
};
