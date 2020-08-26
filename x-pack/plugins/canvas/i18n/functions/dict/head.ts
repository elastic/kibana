/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { head } from '../../../canvas_plugin_src/functions/common/head';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { DATATABLE } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof head>> = {
  help: i18n.translate('xpack.canvas.functions.headHelpText', {
    defaultMessage: 'Retrieves the first {n} rows from the {DATATABLE}. See also {tailFn}.',
    values: {
      n: 'N',
      DATATABLE,
      tailFn: '`tail`',
    },
  }),
  args: {
    count: i18n.translate('xpack.canvas.functions.head.args.countHelpText', {
      defaultMessage: 'The number of rows to retrieve from the beginning of the {DATATABLE}.',
      values: {
        DATATABLE,
      },
    }),
  },
};
