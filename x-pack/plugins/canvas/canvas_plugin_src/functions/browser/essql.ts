/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExpressionFunctionDefinition,
  ExpressionValueFilter,
} from 'src/plugins/expressions/common';
import { searchService } from '../../../public/services';
import { ESSQL_SEARCH_STRATEGY } from '../../../common/lib/constants';
import { EssqlSearchStrategyRequest, EssqlSearchStrategyResponse } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  query: string;
  parameter: Array<string | number | boolean>;
  count: number;
  timezone: string;
}

export function essql(): ExpressionFunctionDefinition<
  'essql',
  ExpressionValueFilter,
  Arguments,
  any
> {
  const { help, args: argHelp } = getFunctionHelp().essql;

  return {
    name: 'essql',
    type: 'datatable',
    context: {
      types: ['filter'],
    },
    help,
    args: {
      query: {
        aliases: ['_', 'q'],
        types: ['string'],
        help: argHelp.query,
      },
      parameter: {
        aliases: ['param'],
        types: ['string', 'number', 'boolean'],
        default: '""',
        multi: true,
        help: argHelp.parameter,
      },
      count: {
        types: ['number'],
        help: argHelp.count,
        default: 1000,
      },
      timezone: {
        aliases: ['tz'],
        types: ['string'],
        default: 'UTC',
        help: argHelp.timezone,
      },
    },
    fn: (input, args, handlers) => {
      const search = searchService.getService().search;
      const { parameter, ...restOfArgs } = args;
      const req = {
        ...restOfArgs,
        params: parameter,
        filter: input.and,
      };

      return search
        .search<EssqlSearchStrategyRequest, EssqlSearchStrategyResponse>(req, {
          strategy: ESSQL_SEARCH_STRATEGY,
        })
        .toPromise()
        .then((resp: EssqlSearchStrategyResponse) => {
          return {
            type: 'datatable',
            meta: {
              type: 'essql',
            },
            ...resp,
          };
        });
    },
  };
}
