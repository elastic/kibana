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
      'Adds a column with the same static value in every row. See also {alterColumnFn} and {mapColumnFn}.',
    values: {
      alterColumnFn: '`alterColumn`',
      mapColumnFn: '`mapColumn`',
    },
  }),
  args: {
    id: i18n.translate('xpack.canvas.functions.staticColumn.args.idHelpText', {
      defaultMessage:
        'An optional id of the resulting column. When no id is provided, the id will be looked up from' +
        'the existing column by the provided name argument. If no column with this name exists yet,' +
        'a new column with this name and an identical id will be added to the table.',
    }),
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

export const errors = {
  invalidIdAndNameArguments: () =>
    new Error(
      i18n.translate('xpack.canvas.functions.timefilter.invalidIdAndNameArgumentsErrorMessage', {
        defaultMessage: 'id or name have to be provided',
      })
    ),
};
