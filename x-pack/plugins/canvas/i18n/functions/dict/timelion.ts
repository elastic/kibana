/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { timelionFunctionFactory } from '../../../public/functions/timelion';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { ELASTICSEARCH, DATEMATH, MOMENTJS_TIMEZONE_URL } from '../../constants';

export const help: FunctionHelp<FunctionFactory<ReturnType<typeof timelionFunctionFactory>>> = {
  help: i18n.translate('xpack.canvas.functions.timelionHelpText', {
    defaultMessage: 'Use Timelion to extract one or more timeseries from many sources.',
  }),
  args: {
    query: i18n.translate('xpack.canvas.functions.timelion.args.query', {
      defaultMessage: 'A Timelion query',
    }),
    interval: i18n.translate('xpack.canvas.functions.timelion.args.interval', {
      defaultMessage: 'The bucket interval for the time series.',
    }),
    from: i18n.translate('xpack.canvas.functions.timelion.args.from', {
      defaultMessage: 'The {ELASTICSEARCH} {DATEMATH} string for the beginning of the time range.',
      values: {
        ELASTICSEARCH,
        DATEMATH,
      },
    }),
    to: i18n.translate('xpack.canvas.functions.timelion.args.to', {
      defaultMessage: 'The {ELASTICSEARCH} {DATEMATH} string for the end of the time range.',
      values: {
        ELASTICSEARCH,
        DATEMATH,
      },
    }),
    timezone: i18n.translate('xpack.canvas.functions.timelion.args.timezone', {
      defaultMessage: 'The timezone for the time range. See {MOMENTJS_TIMEZONE_URL}.',
      values: {
        MOMENTJS_TIMEZONE_URL,
      },
    }),
  },
};
