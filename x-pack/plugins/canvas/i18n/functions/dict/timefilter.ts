/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { timefilter } from '../../../canvas_plugin_src/functions/common/timefilter';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { ISO8601, ELASTICSEARCH, DATEMATH } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof timefilter>> = {
  help: i18n.translate('xpack.canvas.functions.timefilterHelpText', {
    defaultMessage: 'Create a time filter for querying a source.',
  }),
  args: {
    column: i18n.translate('xpack.canvas.functions.timefilter.args.columnHelpText', {
      defaultMessage: 'The column or field that you want to filter.',
    }),
    from: i18n.translate('xpack.canvas.functions.timefilter.args.fromHelpText', {
      defaultMessage:
        'The beginning of the range, in {ISO8601} or {ELASTICSEARCH} {DATEMATH} format',
      values: {
        DATEMATH,
        ELASTICSEARCH,
        ISO8601,
      },
    }),
    to: i18n.translate('xpack.canvas.functions.timefilter.args.toHelpText', {
      defaultMessage: 'The end of the range, in {ISO8601} or {ELASTICSEARCH} {DATEMATH} format',
      values: {
        DATEMATH,
        ELASTICSEARCH,
        ISO8601,
      },
    }),
    filterGroup: i18n.translate('xpack.canvas.functions.timefilter.args.filterGroupHelpText', {
      defaultMessage: 'The group name for the filter.',
    }),
  },
};

export const errors = {
  invalidString: (str: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.timefilter.invalidStringErrorMessage', {
        defaultMessage: "Invalid date/time string: '{str}'",
        values: {
          str,
        },
      })
    ),
};
