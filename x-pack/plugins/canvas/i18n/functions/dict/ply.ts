/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ply } from '../../../canvas_plugin_src/functions/common/ply';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { DATATABLE } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof ply>> = {
  help: i18n.translate('xpack.canvas.functions.plyHelpText', {
    defaultMessage:
      'Subdivides a {DATATABLE} by the unique values of the specified columns, ' +
      'and passes the resulting tables into an expression, then merges the outputs of each expression.',
    values: {
      DATATABLE,
    },
  }),
  args: {
    by: i18n.translate('xpack.canvas.functions.ply.args.byHelpText', {
      defaultMessage: 'The column to subdivide the {DATATABLE}.',
      values: {
        DATATABLE,
      },
    }),
    expression: i18n.translate('xpack.canvas.functions.ply.args.expressionHelpText', {
      defaultMessage:
        'An expression to pass each resulting {DATATABLE} into. ' +
        'Tips: Expressions must return a {DATATABLE}. Use {asFn} to turn literals into {DATATABLE}s. ' +
        'Multiple expressions must return the same number of rows.' +
        'If you need to return a different row count, pipe into another instance of {plyFn}. ' +
        'If multiple expressions returns the columns with the same name, the last one wins.',
      values: {
        asFn: '`as`',
        DATATABLE,
        plyFn: '`ply`',
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
