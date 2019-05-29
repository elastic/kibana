/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { csv } from '../../functions/common/csv';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof csv>> = {
  help: i18n.translate('xpack.canvas.functions.csvHelpText', {
    defaultMessage: 'Create datatable from {csv} input',
    values: {
      csv: 'CSV',
    },
  }),
  args: {
    data: i18n.translate('xpack.canvas.functions.csv.args.dataHelpText', {
      defaultMessage: '{csv} data to use',
      values: {
        csv: 'CSV',
      },
    }),
    delimiter: i18n.translate('xpack.canvas.functions.csv.args.delimeterHelpText', {
      defaultMessage: 'Data separation character',
    }),
    newline: i18n.translate('xpack.canvas.functions.csv.args.newlineHelpText', {
      defaultMessage: 'Row separation character',
    }),
  },
};

export const errors = {
  invalidInputCSV: () =>
    new Error(
      i18n.translate('xpack.canvas.functions.csv.invalidInputCSVErrorMessage', {
        defaultMessage: 'Error parsing input CSV.',
      })
    ),
};
