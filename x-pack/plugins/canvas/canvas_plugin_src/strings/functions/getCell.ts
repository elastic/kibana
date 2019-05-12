/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { getCell } from '../../functions/common/getCell';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof getCell>> = {
  help: i18n.translate('xpack.canvas.functions.vHelpText', {
    defaultMessage: 'Fetch a single cell in a table',
  }),
  args: {
    column: i18n.translate('xpack.canvas.functions.getCell.args.columnHelpText', {
      defaultMessage: 'The name of the column value to fetch',
    }),
    row: i18n.translate('xpack.canvas.functions.getCell.args.rowHelpText', {
      defaultMessage: 'The row number, starting at 0',
    }),
  },
};
