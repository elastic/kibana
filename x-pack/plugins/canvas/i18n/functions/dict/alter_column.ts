/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { alterColumn } from '../../../canvas_plugin_src/functions/common/alterColumn';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { DATATABLE_COLUMN_TYPES } from '../../../common/lib/constants';

export const help: FunctionHelp<FunctionFactory<typeof alterColumn>> = {
  help: i18n.translate('xpack.canvas.functions.alterColumnHelpText', {
    defaultMessage:
      'Converts between core types, including {list}, and {end}, and rename columns. ' +
      'See also {mapColumnFn} and {staticColumnFn}.',
    values: {
      list: Object.values(DATATABLE_COLUMN_TYPES)
        .slice(0, -1)
        .map((type) => `\`${type}\``)
        .join(', '),
      end: Object.values(DATATABLE_COLUMN_TYPES).slice(-1)[0],
      mapColumnFn: '`mapColumn`',
      staticColumnFn: '`staticColumn`',
    },
  }),
  args: {
    column: i18n.translate('xpack.canvas.functions.alterColumn.args.columnHelpText', {
      defaultMessage: 'The name of the column to alter.',
    }),
    name: i18n.translate('xpack.canvas.functions.alterColumn.args.nameHelpText', {
      defaultMessage: 'The resultant column name. Leave blank to not rename.',
    }),
    type: i18n.translate('xpack.canvas.functions.alterColumn.args.typeHelpText', {
      defaultMessage: 'The type to convert the column to. Leave blank to not change type.',
    }),
  },
};

export const errors = {
  columnNotFound: (column: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.alterColumn.columnNotFoundErrorMessage', {
        defaultMessage: "Column not found: '{column}'",
        values: {
          column,
        },
      })
    ),
  cannotConvertType: (type: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.alterColumn.cannotConvertTypeErrorMessage', {
        defaultMessage: "Cannot convert to '{type}'",
        values: {
          type,
        },
      })
    ),
};
