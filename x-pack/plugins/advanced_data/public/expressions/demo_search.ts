/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISearchGeneric } from 'src/plugins/data/public';
import { ExpressionFunction } from '../../../../../src/plugins/expressions/common';
import { Filter } from '../../../../../src/plugins/expressions/public';
import { SQL_SEARCH_STRATEGY, ASYNC_DEMO_SEARCH_STRATEGY } from '../../common';

interface Arguments {
  totalHitCount: number;
  responseTime: number;
}

export function demoSearch(): ExpressionFunction<'demoSearch', Filter, Arguments, any> {
  return {
    name: 'demoSearch',
    type: 'datatable',
    help: '',
    context: {
      types: ['filter', 'datatable'],
    },
    args: {
      totalHitCount: {
        types: ['number'],
        default: 20,
        help: '',
      },
      responseTime: {
        types: ['number'],
        default: 5000,
        help: '',
      },
    },
    fn: async (context, args, handlers) => {
      const doSearch = handlers.search as ISearchGeneric;
      const response = await doSearch(
        { responseTime: args.responseTime, totalHitCount: args.totalHitCount },
        { signal: handlers.abortSignal },
        ASYNC_DEMO_SEARCH_STRATEGY
      ).toPromise();

      return {
        type: 'datatable',
        columns: ['title', 'message'],
        rows: response.hits,
      };
    },
  };
}
