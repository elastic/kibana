/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, Datatable } from 'src/plugins/expressions/public';
import {
  getBucketIdentifier,
  buildResultColumns,
} from '../../../../../../src/plugins/expressions/common';

export interface CounterRateArgs {
  by?: string[];
  inputColumnId: string;
  outputColumnId: string;
  outputColumnName?: string;
}

export type ExpressionFunctionCounterRate = ExpressionFunctionDefinition<
  'lens_counter_rate',
  Datatable,
  CounterRateArgs,
  Datatable
>;

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
export const counterRate: ExpressionFunctionCounterRate = {
  name: 'lens_counter_rate',
  type: 'datatable',

  inputTypes: ['datatable'],

  help: i18n.translate('xpack.lens.functions.counterRate.help', {
    defaultMessage: 'Calculates the counter rate of a column in a data table',
  }),

  args: {
    by: {
      help: i18n.translate('xpack.lens.functions.counterRate.args.byHelpText', {
        defaultMessage: 'Column to split the counter rate calculation by',
      }),
      multi: true,
      types: ['string'],
      required: false,
    },
    inputColumnId: {
      help: i18n.translate('xpack.lens.functions.counterRate.args.inputColumnIdHelpText', {
        defaultMessage: 'Column to calculate the counter rate of',
      }),
      types: ['string'],
      required: true,
    },
    outputColumnId: {
      help: i18n.translate('xpack.lens.functions.counterRate.args.outputColumnIdHelpText', {
        defaultMessage: 'Column to store the resulting counter rate in',
      }),
      types: ['string'],
      required: true,
    },
    outputColumnName: {
      help: i18n.translate('xpack.lens.functions.counterRate.args.outputColumnNameHelpText', {
        defaultMessage: 'Name of the column to store the resulting counter rate in',
      }),
      types: ['string'],
      required: false,
    },
  },

  fn(input, { by, inputColumnId, outputColumnId, outputColumnName }) {
    const resultColumns = buildResultColumns(
      input,
      outputColumnId,
      inputColumnId,
      outputColumnName
    );

    if (!resultColumns) {
      return input;
    }
    const previousValues: Partial<Record<string, number>> = {};
    return {
      ...input,
      columns: resultColumns,
      rows: input.rows.map((row) => {
        const newRow = { ...row };

        const bucketIdentifier = getBucketIdentifier(row, by);
        const previousValue = previousValues[bucketIdentifier];
        const currentValue = newRow[inputColumnId];
        if (currentValue != null && previousValue != null) {
          if (Number(currentValue) >= previousValue) {
            newRow[outputColumnId] = Number(currentValue) - previousValue;
          } else {
            newRow[outputColumnId] = Number(currentValue);
          }
        } else {
          newRow[outputColumnId] = undefined;
        }

        if (currentValue != null) {
          previousValues[bucketIdentifier] = Number(currentValue);
        } else {
          previousValues[bucketIdentifier] = undefined;
        }

        return newRow;
      }),
    };
  },
};
