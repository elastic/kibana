/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { sort } from '../../functions/common/sort';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof sort>> = {
  help: i18n.translate('xpack.canvas.functions.sortHelpText', {
    defaultMessage: 'Sorts a datatable on a column',
  }),
  args: {
    by: i18n.translate('xpack.canvas.functions.sort.args.byHelpText', {
      defaultMessage:
        'The column to sort on. If column is not specified, the {datatable} ' +
        'will be sorted on the first column.',
      values: {
        datatable: 'datatable',
      },
    }),
    reverse: i18n.translate('xpack.canvas.functions.sort.args.reverseHelpText', {
      defaultMessage:
        'Reverse the sort order. If reverse is not specified, the {datatable} ' +
        'will be sorted in ascending order.',
      values: {
        datatable: 'datatable',
      },
    }),
  },
};
