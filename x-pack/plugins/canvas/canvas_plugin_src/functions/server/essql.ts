/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
/* eslint-disable */
// @ts-expect-error untyped local
import { queryEsSQL } from '../../../server/lib/query_es_sql';
/* eslint-enable */
import { ExpressionValueFilter } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  query: string;
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
    fn: (input, args, context) => {
      return queryEsSQL(((context as any) as { elasticsearchClient: any }).elasticsearchClient, {
        ...args,
        filter: input.and,
      });
    },
  };
}
