/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import dateMath from '@elastic/datemath';

export const timefilter = () => ({
  name: 'timefilter',
  aliases: [],
  type: 'filter',
  context: {
    types: ['filter'],
  },
  help: i18n.translate('xpack.canvas.functions.timefilterHelpText', {
    defaultMessage: 'Create a timefilter for querying a source',
  }),
  args: {
    column: {
      type: ['string'],
      aliases: ['field', 'c'],
      default: '@timestamp',
      help: i18n.translate('xpack.canvas.functions.timefilter.args.columnHelpText', {
        defaultMessage: 'The column or field to attach the filter to',
      }),
    },
    from: {
      types: ['string', 'null'],
      aliases: ['f', 'start'],
      help: i18n.translate('xpack.canvas.functions.timefilter.args.fromHelpText', {
        defaultMessage: 'Beginning of the range, in {isoFormat} or Elasticsearch datemath format',
        values: {
          isoFormat: 'ISO8601',
        },
      }),
    },
    to: {
      types: ['string', 'null'],
      aliases: ['t', 'end'],
      help: i18n.translate('xpack.canvas.functions.timefilter.argsToHelpText', {
        defaultMessage: 'End of the range, in {isoFormat} or Elasticsearch datemath format',
        values: {
          isoFormat: 'ISO8601',
        },
      }),
    },
  },
  fn: (context, args) => {
    if (!args.from && !args.to) return context;

    const { from, to, column } = args;
    const filter = {
      type: 'time',
      column,
    };

    function parseAndValidate(str) {
      if (!str) return;

      const moment = dateMath.parse(str);
      if (!moment || !moment.isValid()) {
        throw new Error(
          i18n.translate('xpack.canvas.functions.timefilter.invalidDateTimeStringErrorMessage', {
            defaultMessage: 'Invalid date/time string {str}',
            values: { str },
          })
        );
      }
      return moment.toISOString();
    }

    if (to != null) filter.to = parseAndValidate(to);

    if (from != null) filter.from = parseAndValidate(from);

    return { ...context, and: [...context.and, filter] };
  },
});
