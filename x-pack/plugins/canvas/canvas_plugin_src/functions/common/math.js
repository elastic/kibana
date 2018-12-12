/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { evaluate } from 'tinymath';
import { getFunctionErrors } from '../../errors';
import { pivotObjectArray } from '../../../common/lib/pivot_object_array';

export const math = () => {
  const functionErrors = getFunctionErrors();

  return {
    name: 'math',
    type: 'number',
    help:
      'Interpret a math expression, with a number or datatable as context. Datatable columns are available by their column name. ' +
      'If you pass in a number it is available as "value" (without the quotes)',
    context: {
      types: ['number', 'datatable'],
    },
    args: {
      expression: {
        aliases: ['_'],
        types: ['string'],
        help:
          'An evaluated TinyMath expression. (See [TinyMath Functions](https://www.elastic.co/guide/en/kibana/current/canvas-tinymath-functions.html))',
      },
    },
    fn: (context, args) => {
      if (!args.expression || args.expression.trim() === '') {
        throw functionErrors.math.expressionEmpty();
      }

      const isDatatable = context && context.type === 'datatable';
      const mathContext = isDatatable
        ? pivotObjectArray(context.rows, context.columns.map(col => col.name))
        : { value: context };
      try {
        const result = evaluate(args.expression, mathContext);
        if (Array.isArray(result)) {
          if (result.length === 1) {
            return result[0];
          }
          throw functionErrors.math.resultLengthInvalid();
        }
        if (isNaN(result)) {
          throw functionErrors.math.executeFailure();
        }
        return result;
      } catch (e) {
        if (context.rows.length === 0) {
          throw functionErrors.math.datatableEmpty();
        } else {
          throw e;
        }
      }
    },
  };
};
