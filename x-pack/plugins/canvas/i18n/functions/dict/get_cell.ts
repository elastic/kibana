/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { getCell } from '../../../canvas_plugin_src/functions/common/getCell';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { DATATABLE } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof getCell>> = {
  help: i18n.translate('xpack.canvas.functions.getCellHelpText', {
    defaultMessage: 'Fetches a single cell from a {DATATABLE}.',
    values: {
      DATATABLE,
    },
  }),
  args: {
    column: i18n.translate('xpack.canvas.functions.getCell.args.columnHelpText', {
      defaultMessage:
        'The name of the column to fetch the value from. ' +
        'If not provided, the value is retrieved from the first column.',
    }),
    row: i18n.translate('xpack.canvas.functions.getCell.args.rowHelpText', {
      defaultMessage: 'The row number, starting at 0.',
    }),
  },
};

export const errors = {
  rowNotFound: (row: number) =>
    new Error(
      i18n.translate('xpack.canvas.functions.getCell.rowNotFoundErrorMessage', {
        defaultMessage: "Row not found: '{row}'",
        values: {
          row,
        },
      })
    ),
  columnNotFound: (column: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.getCell.columnNotFoundErrorMessage', {
        defaultMessage: "Column not found: '{column}'",
        values: {
          column,
        },
      })
    ),
};
