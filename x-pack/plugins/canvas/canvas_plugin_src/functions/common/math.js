/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { evaluate } from 'tinymath';
import { i18n } from '@kbn/i18n';
import { pivotObjectArray } from '../../../common/lib/pivot_object_array';

export const math = () => ({
  name: 'math',
  type: 'number',
  help: i18n.translate('xpack.canvas.functions.mathHelpText', {
    defaultMessage:
      'Interpret a math expression, with a number or datatable as context. Datatable columns are available by their column name. If you pass in a number it is available as "value" (without the quotes)',
  }),
  context: {
    types: ['number', 'datatable'],
  },
  args: {
    expression: {
      aliases: ['_'],
      types: ['string'],
      help: i18n.translate('xpack.canvas.functions.math.args.expressionHelpText', {
        defaultMessage:
          'An evaluated TinyMath expression. (See [TinyMath Functions]({tinyMathFunctionsLink}))',
        values: {
          tinyMathFunctionsLink: 'http://canvas.elastic.co/reference/tinymath.html',
        },
      }),
    },
  },
  fn: (context, args) => {
    if (!args.expression || args.expression.trim() === '') {
      throw new Error(
        i18n.translate('xpack.canvas.functions.math.emptyExpressionErrorMessage', {
          defaultMessage: 'Empty expression',
        })
      );
    }

    const isDatatable = context && context.type === 'datatable';
    const mathContext = isDatatable
      ? pivotObjectArray(context.rows, context.columns.map(col => col.name))
      : { value: context };
    try {
      const result = evaluate(args.expression, mathContext);
      if (Array.isArray(result)) {
        if (result.length === 1) return result[0];
        throw new Error(
          i18n.translate('xpack.canvas.functions.math.expressionReturnValueErrorMessage', {
            defaultMessage:
              'Expressions must return a single number. Try wrapping your expression in mean() or sum()',
          })
        );
      }
      if (isNaN(result)) {
        throw new Error(
          i18n.translate('xpack.canvas.functions.math.executeMathExpressionErrorMessage', {
            defaultMessage: 'Failed to execute math expression. Check your column names',
          })
        );
      }
      return result;
    } catch (e) {
      if (context.rows.length === 0) {
        throw new Error(
          i18n.translate('xpack.canvas.functions.math.emptyDatabaseErrorMessage', {
            defaultMessage: 'Empty datatable',
          })
        );
      } else {
        throw e;
      }
    }
  },
});
