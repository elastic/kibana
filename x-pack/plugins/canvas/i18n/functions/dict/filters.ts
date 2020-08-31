/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { filtersFunctionFactory } from '../../../public/functions/filters';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<ReturnType<typeof filtersFunctionFactory>>> = {
  help: i18n.translate('xpack.canvas.functions.filtersHelpText', {
    defaultMessage:
      'Aggregates element filters from the workpad for use elsewhere, usually a data source.',
  }),
  args: {
    group: i18n.translate('xpack.canvas.functions.filters.args.group', {
      defaultMessage: 'The name of the filter group to use.',
    }),
    ungrouped: i18n.translate('xpack.canvas.functions.filters.args.ungrouped', {
      defaultMessage: 'Exclude filters that belong to a filter group?',
    }),
  },
};
