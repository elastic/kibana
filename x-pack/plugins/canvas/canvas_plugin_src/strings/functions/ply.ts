/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ply } from '../../functions/common/ply';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof ply>> = {
  help: i18n.translate('xpack.canvas.functions.plyHelpText', {
    defaultMessage:
      'Subdivide a {datatable} and pass the resulting tables into an expression, then merge the output',
    values: {
      datatable: 'datatable',
    },
  }),
  args: {
    by: i18n.translate('xpack.canvas.functions.ply.args.byHelpText', {
      defaultMessage: 'The column to subdivide on',
    }),
    expression: i18n.translate('xpack.canvas.functions.ply.args.expressionHelpText', {
      defaultMessage:
        'An expression to pass each resulting {datatable} into. Tips: \n' +
        ' Expressions must return a {datatable}. Use `as` to turn literals into {datatable}.\n' +
        ' Multiple expressions must return the same number of rows.' +
        ' If you need to return a differing row count, pipe into another instance of {ply}.\n' +
        ' If multiple expressions return the same columns, the last one wins.',
      values: {
        datatable: 'datatable',
        ply: 'ply',
      },
    }),
  },
};

export const errors = {
  columnNotFound: (by: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.ply.columnNotFoundErrorMessage', {
        defaultMessage: "Column not found: '{by}'",
        values: {
          by,
        },
      })
    ),
  rowCountMismatch: () =>
    new Error(
      i18n.translate('xpack.canvas.functions.ply.rowCountMismatchErrorMessage', {
        defaultMessage: 'All expressions must return the same number of rows',
      })
    ),
};
