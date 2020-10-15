/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { tail } from '../../../canvas_plugin_src/functions/common/tail';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { DATATABLE } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof tail>> = {
  help: i18n.translate('xpack.canvas.functions.tailHelpText', {
    defaultMessage: 'Retrieves the last N rows from the end of a {DATATABLE}. See also {headFn}.',
    values: {
      DATATABLE,
      headFn: '`head`',
    },
  }),
  args: {
    count: i18n.translate('xpack.canvas.functions.tail.args.countHelpText', {
      defaultMessage: 'The number of rows to retrieve from the end of the {DATATABLE}.',
      values: {
        DATATABLE,
      },
    }),
  },
};
