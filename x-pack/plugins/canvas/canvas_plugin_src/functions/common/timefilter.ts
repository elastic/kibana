/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import { ContextFunction, Filter } from '../types';

interface Arguments {
  column: string;
  from: string | null;
  to: string | null;
}

export function timefilter(): ContextFunction<'timefilter', Filter, Arguments, Filter> {
  return {
    name: 'timefilter',
    aliases: [],
    type: 'filter',
    context: {
      types: ['filter'],
    },
    help: 'Create a timefilter for querying a source',
    args: {
      column: {
        types: ['string'],
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
        and: [],
      };

      function parseAndValidate(str: string): string {
        const moment = dateMath.parse(str);

        if (!moment || !moment.isValid()) {
          throw new Error(`Invalid date/time string: '${str}'`);
        }

        return moment.toISOString();
      }

      if (!!to) {
        (filter as any).to = parseAndValidate(to);
      }

      if (!!from) {
        (filter as any).from = parseAndValidate(from);
      }

      return { ...context, and: [...context.and, filter] };
    },
  };
}
