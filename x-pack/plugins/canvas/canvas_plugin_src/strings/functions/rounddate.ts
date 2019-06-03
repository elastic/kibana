/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { rounddate } from '../../functions/common/rounddate';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof rounddate>> = {
  help: i18n.translate('xpack.canvas.functions.rounddateHelpText', {
    defaultMessage:
      'Round {ms} since epoch using a {moment} formatting string. Returns {ms} since epoch',
    values: {
      ms: 'ms',
      moment: 'MomentJS',
    },
  }),
  args: {
    format: i18n.translate('xpack.canvas.functions.rounddate.args.formatHelpText', {
      defaultMessage:
        '{moment} format with which to bucket (See {url}). For example "{example}" would round to the month',
      values: {
        moment: 'MomentJS',
        url: 'https://momentjs.com/docs/#/displaying/',
        example: 'YYYY-MM',
      },
    }),
  },
};
