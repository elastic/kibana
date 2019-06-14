/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { joinRows } from '../../functions/common/joinRows';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof joinRows>> = {
  help: i18n.translate('xpack.canvas.functions.joinRowsHelpText', {
    defaultMessage: 'Add a column calculated as the result of other columns, or not',
  }),
  args: {
    column: i18n.translate('xpack.canvas.functions.joinRows.args.columnHelpText', {
      defaultMessage: 'Column to join values from',
    }),
    separator: i18n.translate('xpack.canvas.functions.joinRows.args.separatorHelpText', {
      defaultMessage: 'Separator to use between row values',
    }),
    quote: i18n.translate('xpack.canvas.functions.joinRows.args.quoteHelpText', {
      defaultMessage: 'Quote character around values',
    }),
  },
};

export const errors = {
  rowNotFound: (row: number) =>
    new Error(
      i18n.translate('xpack.canvas.functions.joinRows.rowNotFoundErrorMessage', {
        defaultMessage: "Row not found: '{row}'",
        values: {
          row,
        },
      })
    ),
};
