/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { csv } from '../../../canvas_plugin_src/functions/common/csv';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { DATATABLE, CSV } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof csv>> = {
  help: i18n.translate('xpack.canvas.functions.csvHelpText', {
    defaultMessage: 'Creates a {DATATABLE} from {CSV} input.',
    values: {
      DATATABLE,
      CSV,
    },
  }),
  args: {
    data: i18n.translate('xpack.canvas.functions.csv.args.dataHelpText', {
      defaultMessage: 'The {CSV} data to use.',
      values: {
        CSV,
      },
    }),
    delimiter: i18n.translate('xpack.canvas.functions.csv.args.delimeterHelpText', {
      defaultMessage: 'The data separation character.',
    }),
    newline: i18n.translate('xpack.canvas.functions.csv.args.newlineHelpText', {
      defaultMessage: 'The row separation character.',
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
