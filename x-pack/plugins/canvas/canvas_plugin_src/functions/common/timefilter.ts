/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import { ContextFunction, Filter } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  column: string;
  from: string | null;
  to: string | null;
  filterGroup: string | null;
}

export function timefilter(): ContextFunction<'timefilter', Filter, Arguments, Filter> {
  const { help, args: argHelp } = getFunctionHelp().timefilter;

  return {
    name: 'timefilter',
    aliases: [],
    type: 'filter',
    context: {
      types: ['filter'],
    },
    help,
    args: {
      column: {
        types: ['string'],
        aliases: ['field', 'c'],
        default: '@timestamp',
        help: argHelp.column,
      },
      from: {
        types: ['string', 'null'],
        aliases: ['f', 'start'],
        help: argHelp.from,
      },
      to: {
        types: ['string', 'null'],
        aliases: ['t', 'end'],
        help: argHelp.to,
      },
      filterGroup: {
        types: ['string', 'null'],
        help: 'Group name for the filter',
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
