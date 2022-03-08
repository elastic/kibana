/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { staticColumn } from '../../../canvas_plugin_src/functions/common/staticColumn';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof staticColumn>> = {
  help: i18n.translate('xpack.canvas.functions.staticColumnHelpText', {
    defaultMessage:
      'Adds a column with the same static value in every row. See also {alterColumnFn}, {mapColumnFn}, and {mathColumnFn}',
    values: {
      alterColumnFn: '`alterColumn`',
      mapColumnFn: '`mapColumn`',
      mathColumnFn: '`mathColumn`',
    },
  }),
  args: {
    name: i18n.translate('xpack.canvas.functions.staticColumn.args.nameHelpText', {
      defaultMessage: 'The name of the new column.',
    }),
    value: i18n.translate('xpack.canvas.functions.staticColumn.args.valueHelpText', {
      defaultMessage:
        'The value to insert in each row in the new column. TIP: use a sub-expression to rollup ' +
        'other columns into a static value.',
    }),
  },
};
