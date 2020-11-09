/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { filterrows } from '../../../canvas_plugin_src/functions/common/filterrows';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { DATATABLE, TYPE_BOOLEAN, BOOLEAN_TRUE, BOOLEAN_FALSE } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof filterrows>> = {
  help: i18n.translate('xpack.canvas.functions.filterrowsHelpText', {
    defaultMessage: 'Filters rows in a {DATATABLE} based on the return value of a sub-expression.',
    values: {
      DATATABLE,
    },
  }),
  args: {
    fn: i18n.translate('xpack.canvas.functions.filterrows.args.fnHelpText', {
      defaultMessage:
        'An expression to pass into each row in the {DATATABLE}. ' +
        'The expression should return a {TYPE_BOOLEAN}. ' +
        'A {BOOLEAN_TRUE} value preserves the row, and a {BOOLEAN_FALSE} value removes it.',
      values: {
        BOOLEAN_FALSE,
        BOOLEAN_TRUE,
        DATATABLE,
        TYPE_BOOLEAN,
      },
    }),
  },
};
