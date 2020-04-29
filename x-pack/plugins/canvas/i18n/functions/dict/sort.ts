/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { sort } from '../../../canvas_plugin_src/functions/common/sort';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { DATATABLE } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof sort>> = {
  help: i18n.translate('xpack.canvas.functions.sortHelpText', {
    defaultMessage: 'Sorts a {DATATABLE} by the specified column.',
    values: {
      DATATABLE,
    },
  }),
  args: {
    by: i18n.translate('xpack.canvas.functions.sort.args.byHelpText', {
      defaultMessage:
        'The column to sort by. When unspecified, the {DATATABLE} ' +
        'is sorted by the first column.',
      values: {
        DATATABLE,
      },
    }),
    reverse: i18n.translate('xpack.canvas.functions.sort.args.reverseHelpText', {
      defaultMessage:
        'Reverses the sorting order. When unspecified, the {DATATABLE} ' +
        'is sorted in ascending order.',
      values: {
        DATATABLE,
      },
    }),
  },
};
