/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { timerange } from '../../../canvas_plugin_src/functions/common/time_range';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof timerange>> = {
  help: i18n.translate('xpack.canvas.functions.timerangeHelpText', {
    defaultMessage: `An object that represents a span of time.`,
  }),
  args: {
    from: i18n.translate('xpack.canvas.functions.timerange.args.fromHelpText', {
      defaultMessage: `The start of the time range`,
    }),
    to: i18n.translate('xpack.canvas.functions.timerange.args.toHelpText', {
      defaultMessage: `The end of the time range`,
    }),
  },
};
