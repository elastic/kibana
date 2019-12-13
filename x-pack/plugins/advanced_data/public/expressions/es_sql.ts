/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISearchGeneric } from 'src/plugins/data/public';
import { ExpressionFunction } from '../../../../../src/plugins/expressions/common';
import { Filter } from '../../../../../src/plugins/expressions/public';
import { SQL_SEARCH_STRATEGY } from '../../common';

interface Arguments {
  query: string;
  count: number;
  timezone: string;
}

export function esSql(): ExpressionFunction<'essql', Filter, Arguments, any> {
  const argHelp = {
    query: '',
    count: '',
    timezone: '',
  };

  return {
    name: 'essql',
    type: 'datatable',
    help: '',
    context: {
      types: ['filter'],
    },
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
    fn: (context, args, handlers) => {
      const doSearch = handlers.search as ISearchGeneric;
      return doSearch({ sql: args.query }, {}, SQL_SEARCH_STRATEGY);
    },
  };
}
