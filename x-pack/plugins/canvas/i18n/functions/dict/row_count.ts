/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { rowCount } from '../../../canvas_plugin_src/functions/common/rowCount';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof rowCount>> = {
  help: i18n.translate('xpack.canvas.functions.rowCountHelpText', {
    defaultMessage:
      'Returns the number of rows. Pairs with {plyFn} to get the count of unique column ' +
      'values, or combinations of unique column values.',
    values: {
      plyFn: '`ply`',
    },
  }),
  args: {},
};
