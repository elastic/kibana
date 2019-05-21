/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { rowCount } from '../../functions/common/rowCount';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof rowCount>> = {
  help: i18n.translate('xpack.canvas.functions.rowCountHelpText', {
    defaultMessage:
      'Return the number of rows. Pair with {ply} to get the count of unique column ' +
      'values, or combinations of unique column values.',
    values: {
      ply: 'ply',
    },
  }),
  args: {},
};
