/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { tail } from '../../functions/common/tail';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof tail>> = {
  help: i18n.translate('xpack.canvas.functions.tailHelpText', {
    defaultMessage: 'Get the last N rows from the end of a {datatable}. Also see `{head}`',
    values: {
      datatable: 'datatable',
      head: 'head',
    },
  }),
  args: {
    count: i18n.translate('xpack.canvas.functions.tail.args.countHelpText', {
      defaultMessage: 'Return this many rows from the end of the {datatable}',
      values: {
        datatable: 'datatable',
      },
    }),
  },
};
