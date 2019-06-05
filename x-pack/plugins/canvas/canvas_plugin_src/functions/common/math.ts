/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore no @typed def; Elastic library
import { evaluate } from 'tinymath';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
// @ts-ignore untyped local
import { pivotObjectArray } from '../../../common/lib/pivot_object_array';
import { Datatable, isDatatable } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  expression: string;
}

type Context = number | Datatable;

export function math(): ExpressionFunction<'math', Context, Arguments, number> {
  const { help, args: argHelp } = getFunctionHelp().math;

  return {
    name: 'math',
    type: 'number',
    help,
    context: {
      types: ['number', 'datatable'],
    },
    args: {
      expression: {
        aliases: ['_'],
        types: ['string'],
        help: argHelp.expression,
      },
    },
    fn: (context, args) => {
      const { expression } = args;

      if (!expression || expression.trim() === '') {
        throw new Error('Empty expression');
      }

      const mathContext = isDatatable(context)
        ? pivotObjectArray(context.rows, context.columns.map(col => col.name))
        : { value: context };

      try {
        const result = evaluate(expression, mathContext);
        if (Array.isArray(result)) {
          if (result.length === 1) {
            return result[0];
          }
          throw new Error(
            'Expressions must return a single number. Try wrapping your expression in mean() or sum()'
          );
        }
        if (isNaN(result)) {
          throw new Error('Failed to execute math expression. Check your column names');
        }
        return result;
      } catch (e) {
        if (isDatatable(context) && context.rows.length === 0) {
          throw new Error('Empty datatable');
        } else {
          throw e;
        }
      }
    },
  };
}
