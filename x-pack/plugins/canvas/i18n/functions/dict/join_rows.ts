/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { joinRows } from '../../../canvas_plugin_src/functions/common/join_rows';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof joinRows>> = {
  help: i18n.translate('xpack.canvas.functions.joinRowsHelpText', {
    defaultMessage: 'Concatenates values from rows in a `datatable` into a single string.',
  }),
  args: {
    column: i18n.translate('xpack.canvas.functions.joinRows.args.columnHelpText', {
      defaultMessage: 'The column or field from which to extract the values.',
    }),
    separator: i18n.translate('xpack.canvas.functions.joinRows.args.separatorHelpText', {
      defaultMessage: 'The delimiter to insert between each extracted value.',
    }),
    quote: i18n.translate('xpack.canvas.functions.joinRows.args.quoteHelpText', {
      defaultMessage: 'The quote character to wrap around each extracted value.',
    }),
    distinct: i18n.translate('xpack.canvas.functions.joinRows.args.distinctHelpText', {
      defaultMessage: 'Extract only unique values?',
    }),
  },
};

export const errors = {
  columnNotFound: (column: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.joinRows.columnNotFoundErrorMessage', {
        defaultMessage: "Column not found: '{column}'",
        values: {
          column,
        },
      })
    ),
};
