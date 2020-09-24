/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, KibanaDatatable } from 'src/plugins/expressions';

interface DerivativeArgs {
  groupBy: string[];
  inputColumn: string;
  outputColumnId: string;
  outputColumnName: string;
  outputColumnSerializedFormat: string;
}

export const derivativeFunction: ExpressionFunctionDefinition<
  'derivative',
  KibanaDatatable,
  DerivativeArgs,
  KibanaDatatable
> = {
  name: 'derivative',
  type: 'kibana_datatable',
  help: i18n.translate('xpack.lens.functions.derivativeFn.help', {
    defaultMessage: 'Takes the difference between sequential values in a sorted table',
  }),
  args: {
    groupBy: {
      types: ['string'],
      multi: true,
      required: false,
      help: '',
    },
    inputColumn: {
      types: ['string'],
      required: true,
      help: '',
    },
    outputColumnId: {
      types: ['string'],
      required: true,
      help: '',
    },
    outputColumnName: {
      types: ['string'],
      required: true,
      help: '',
    },
    outputColumnSerializedFormat: {
      types: ['string'],
      required: true,
      help: '',
    },
  },
  inputTypes: ['kibana_datatable'],
  fn(
    data,
    { groupBy, inputColumn, outputColumnId, outputColumnName, outputColumnSerializedFormat }
  ) {
    const previousInGroup: Record<string, number | undefined> = {};

    return {
      type: 'kibana_datatable',
      rows: data.rows.map((row) => {
        const groupKey = groupBy.length ? groupBy.map((g) => row[g]).join(',') : 'all';
        const previous = previousInGroup[groupKey];
        const current = row[inputColumn] as number | undefined;
        let output: number | undefined;
        if (typeof current === 'number') {
          if (typeof previous === 'number') {
            output = current - previous;
          } else {
            output = 0;
          }
        }
        previousInGroup[groupKey] = current;

        return { ...row, [outputColumnId]: output };
      }),
      columns: [
        ...data.columns,
        {
          id: outputColumnId,
          name: outputColumnName,
          formatHint: JSON.parse(outputColumnSerializedFormat),
        },
      ],
    };
  },
};
