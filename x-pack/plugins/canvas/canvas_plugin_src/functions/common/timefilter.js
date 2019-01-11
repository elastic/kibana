/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';

export const timefilter = () => ({
  name: 'timefilter',
  aliases: [],
  type: 'filter',
  context: {
    types: ['filter'],
  },
  help: 'Create a timefilter for querying a source',
  args: {
    column: {
      type: ['string'],
      aliases: ['field', 'c'],
      default: '@timestamp',
      help: 'The column or field to attach the filter to',
    },
    from: {
      types: ['string', 'null'],
      aliases: ['f', 'start'],
      help: 'Beginning of the range, in ISO8601 or Elasticsearch datemath format',
    },
    to: {
      types: ['string', 'null'],
      aliases: ['t', 'end'],
      help: 'End of the range, in ISO8601 or Elasticsearch datemath format',
    },
  },
  fn: (context, args) => {
    if (!args.from && !args.to) {
      return context;
    }

    const { from, to, column } = args;
    const filter = {
      type: 'time',
      column,
    };

    function parseAndValidate(str) {
      if (!str) {
        return;
      }

      const moment = dateMath.parse(str);
      if (!moment || !moment.isValid()) {
        throw new Error(`Invalid date/time string: '${str}'`);
      }
      return moment.toISOString();
    }

    if (to != null) {
      filter.to = parseAndValidate(to);
    }

    if (from != null) {
      filter.from = parseAndValidate(from);
    }

    return { ...context, and: [...context.and, filter] };
  },
});
