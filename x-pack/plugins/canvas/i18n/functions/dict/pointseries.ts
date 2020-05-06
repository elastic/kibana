/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { pointseries } from '../../../canvas_plugin_src/functions/server/pointseries';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { DATATABLE, TINYMATH, TINYMATH_URL } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof pointseries>> = {
  help: i18n.translate('xpack.canvas.functions.pointseriesHelpText', {
    defaultMessage:
      'Turn a {DATATABLE} into a point series model. Currently we differentiate measure ' +
      'from dimensions by looking for a {TINYMATH} expression. See {TINYMATH_URL}. If you enter a {TINYMATH} expression in your ' +
      'argument, we treat that argument as a measure, otherwise it is a dimension. Dimensions ' +
      'are combined to create unique keys. Measures are then deduplicated by those keys using ' +
      'the specified {TINYMATH} function',
    values: {
      DATATABLE,
      TINYMATH,
      TINYMATH_URL,
    },
  }),
  args: {
    color: i18n.translate('xpack.canvas.functions.pointseries.args.colorHelpText', {
      defaultMessage: "An expression to use in determining the mark's color.",
    }),
    size: i18n.translate('xpack.canvas.functions.pointseries.args.sizeHelpText', {
      defaultMessage: 'The size of the marks. Only applicable to supported elements.',
    }),
    text: i18n.translate('xpack.canvas.functions.pointseries.args.textHelpText', {
      defaultMessage: 'The text to show on the mark. Only applicable to supported elements.',
    }),
    x: i18n.translate('xpack.canvas.functions.pointseries.args.xHelpText', {
      defaultMessage: 'The values along the x-axis.',
    }),
    y: i18n.translate('xpack.canvas.functions.pointseries.args.yHelpText', {
      defaultMessage: 'The values along the y-axis.',
    }),
  },
};

export const errors = {
  unwrappedExpression: () =>
    new Error(
      i18n.translate('xpack.canvas.functions.pointseries.unwrappedExpressionErrorMessage', {
        defaultMessage: 'Expressions must be wrapped in a function such as {fn}',
        values: {
          fn: 'sum()',
        },
      })
    ),
};
