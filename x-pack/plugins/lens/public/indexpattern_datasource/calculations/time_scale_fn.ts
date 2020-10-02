/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, KibanaDatatable } from 'src/plugins/expressions';

interface TimescaleArgs {
  inputColumn: string;
  scale?: '1s' | '1m' | '1h';
}

const scaleToMultiple = {
  '1s': 1 / 3 / 60 / 60,
  '1m': 1 / 3 / 60,
  '1h': 1 / 3,
};

export const timescaleFunction: ExpressionFunctionDefinition<
  'time_scale',
  KibanaDatatable,
  TimescaleArgs,
  KibanaDatatable
> = {
  name: 'time_scale',
  type: 'kibana_datatable',
  help: i18n.translate('xpack.lens.functions.timescaleFn.help', {
    defaultMessage: 'Converts a column with date histogram data into a per-time-unit value',
  }),
  args: {
    inputColumn: {
      types: ['string'],
      required: true,
      help: '',
    },
    scale: {
      types: ['string'],
      help: '',
    },
  },
  inputTypes: ['kibana_datatable'],
  fn(data, { inputColumn, scale }) {
    return {
      ...data,
      rows: data.rows.map((row) => {
        const current = row[inputColumn] as number | undefined;
        if (scale && current) {
          return { ...row, [inputColumn]: current * scaleToMultiple[scale] };
        }
        return row;
      }),
    };
  },
};
