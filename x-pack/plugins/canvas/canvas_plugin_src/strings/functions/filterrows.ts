/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { filterrows } from '../../functions/common/filterrows';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof filterrows>> = {
  help: i18n.translate('xpack.canvas.functions.filterrowsHelpText', {
    defaultMessage: 'Filter rows in a datatable based on the return value of a subexpression.',
  }),
  args: {
    fn: i18n.translate('xpack.canvas.functions.filterrows.args.fnHelpText', {
      defaultMessage:
        'An expression to pass each rows in the datatable into. The expression should return a ' +
        'boolean. A true value will preserve the row, and a false value will remove it.',
    }),
  },
};
