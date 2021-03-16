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
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  query: string;
  count: number;
  timezone: string;
}

export function essqlOther(): ExpressionFunctionDefinition<
  'essqlOther',
  ExpressionValueFilter,
  Arguments,
  any
> {
  const { help, args: argHelp } = getFunctionHelp().essql;

  return {
    name: 'essqlOther',
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
      const req = {
        ...args,
        filter: input.and,
      };

      return search
        .search<any, any>(req, { strategy: 'essql' })
        .toPromise()
        .then((resp: any) => {
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
