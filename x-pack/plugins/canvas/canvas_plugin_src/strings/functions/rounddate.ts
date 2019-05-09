/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { rounddate as rounddateFn } from '../../functions/common/rounddate';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof rounddateFn>> = {
  help: i18n.translate('xpack.canvas.functions.rounddateHelpText', {
    defaultMessage: 'Round ms since epoch using a moment formatting string. Returns ms since epoch',
  }),
  args: {
    format: i18n.translate('xpack.canvas.functions.rounddate.args.formatHelpText', {
      defaultMessage:
        'MomentJS Format with which to bucket (See https://momentjs.com/docs/#/displaying/). For example "YYYY-MM" would round to the month',
    }),
  },
};
