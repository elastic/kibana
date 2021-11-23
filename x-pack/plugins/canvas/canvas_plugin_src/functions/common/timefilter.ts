/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import { ExpressionValueFilter, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

interface Arguments {
  column: string;
  from: string;
  to: string;
  filterGroup: string;
}

export function timefilter(): ExpressionFunctionDefinition<
  'timefilter',
  ExpressionValueFilter,
  Arguments,
  ExpressionValueFilter
> {
  const { help, args: argHelp } = getFunctionHelp().timefilter;
  const errors = getFunctionErrors().timefilter;

  return {
    name: 'timefilter',
    aliases: [],
    type: 'filter',
    inputTypes: ['filter'],
    help,
    args: {
      column: {
        types: ['string'],
        aliases: ['field', 'c'],
        default: '@timestamp',
        help: argHelp.column,
      },
      from: {
        types: ['string'],
        aliases: ['f', 'start'],
        help: argHelp.from,
      },
      to: {
        types: ['string'],
        aliases: ['t', 'end'],
        help: argHelp.to,
      },
      filterGroup: {
        types: ['string'],
        help: 'The group name for the filter',
      },
    },
    fn: (input, args) => {
      if (!args.from && !args.to) {
        return input;
      }

      const { from, to, column, filterGroup } = args;
      const filter: ExpressionValueFilter = {
        type: 'filter',
        filterType: 'time',
        column,
        filterGroup,
        and: [],
      };

      function parseAndValidate(str: string, { roundUp }: { roundUp: boolean }): string {
        const moment = dateMath.parse(str, { roundUp });

        if (!moment || !moment.isValid()) {
          throw errors.invalidString(str);
        }

        return moment.toISOString();
      }

      if (!!to) {
        filter.to = parseAndValidate(to, { roundUp: true });
      }

      if (!!from) {
        filter.from = parseAndValidate(from, { roundUp: false });
      }

      return { ...input, and: [...input.and, filter] };
    },
  };
}
