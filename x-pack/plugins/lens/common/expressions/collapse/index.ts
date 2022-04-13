/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { CollapseExpressionFunction } from './types';

export interface CollapseArgs {
  table: string;
  by?: string[];
  metric?: string[];
  fn: 'sum' | 'avg' | 'min' | 'max';
}

/**
 * Calculates the counter rate of a specified column in the data table.
 *
 * Also supports multiple series in a single data table - use the `by` argument
 * to specify the columns to split the calculation by.
 * For each unique combination of all `by` columns a separate counter rate will be calculated.
 * The order of rows won't be changed - this function is not modifying any existing columns, it's only
 * adding the specified `outputColumnId` column to every row of the table without adding or removing rows.
 *
 * Behavior:
 * * Will write the counter rate of `inputColumnId` into `outputColumnId`
 * * If provided will use `outputColumnName` as name for the newly created column. Otherwise falls back to `outputColumnId`
 * * Counter rate always start with an undefined value for the first row of a series.
 * * If the value of the current cell is not smaller than the previous one, an output cell will contain
 * * its own value minus the value of the previous cell of the same series. If the value is smaller,
 * * an output cell will contain its own value
 *
 * Edge cases:
 * * Will return the input table if `inputColumnId` does not exist
 * * Will throw an error if `outputColumnId` exists already in provided data table
 * * If there is no previous row of the current series with a non `null` or `undefined` value, the output cell of the current row
 *   will be set to `undefined`.
 * * If the row value contains `null` or `undefined`, it will be ignored and the output cell will be set to `undefined`
 * * If the value of the previous row of the same series contains `null` or `undefined`, the output cell of the current row will be set to `undefined` as well
 * * For all values besides `null` and `undefined`, the value will be cast to a number before it's used in the
 *   calculation of the current series even if this results in `NaN` (like in case of objects).
 * * To determine separate series defined by the `by` columns, the values of these columns will be cast to strings
 *   before comparison. If the values are objects, the return value of their `toString` method will be used for comparison.
 *   Missing values (`null` and `undefined`) will be treated as empty strings.
 */
export const collapse: CollapseExpressionFunction = {
  name: 'lens_collapse',
  type: 'lens_multitable',

  inputTypes: ['lens_multitable'],

  help: i18n.translate('xpack.lens.functions.counterRate.help', {
    defaultMessage: 'Calculates the counter rate of a column in a data table',
  }),

  args: {
    table: {
      help: '',
      types: ['string'],
      required: true,
    },
    by: {
      help: i18n.translate('xpack.lens.functions.counterRate.args.byHelpText', {
        defaultMessage: 'Column to split the counter rate calculation by',
      }),
      multi: true,
      types: ['string'],
      required: false,
    },
    metric: {
      help: i18n.translate('xpack.lens.functions.counterRate.args.inputColumnIdHelpText', {
        defaultMessage: 'Column to calculate the counter rate of',
      }),
      types: ['string'],
      multi: true,
      required: false,
    },
    fn: {
      help: '',
      types: ['string'],
      required: true,
    },
  },

  async fn(...args) {
    /** Build optimization: prevent adding extra code into initial bundle **/
    const { collapseFn } = await import('./collapse_fn');
    return collapseFn(...args);
  },
};
