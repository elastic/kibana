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
/* eslint-disable */
// @ts-expect-error untyped local
import { buildESRequest } from '../../../server/lib/build_es_request';
/* eslint-enable */
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  index: string | null;
  query: string;
}

export function escount(): ExpressionFunctionDefinition<
  'escount',
  ExpressionValueFilter,
  Arguments,
  any
> {
  const { help, args: argHelp } = getFunctionHelp().escount;

  return {
    name: 'escount',
    type: 'number',
    context: {
      types: ['filter'],
    },
    help,
    args: {
      query: {
        types: ['string'],
        aliases: ['_', 'q'],
        help: argHelp.query,
        default: '"-_index:.kibana"',
      },
      index: {
        types: ['string'],
        default: '_all',
        help: argHelp.index,
      },
    },
    fn: (input, args, handlers) => {
      input.and = input.and.concat([
        {
          type: 'filter',
          filterType: 'luceneQueryString',
          query: args.query,
          and: [],
        },
      ]);

      const esRequest = buildESRequest(
        {
          index: args.index,
          body: {
            query: {
              bool: {
                must: [{ match_all: {} }],
              },
            },
          },
        },
        input
      );

      return ((handlers as any) as { elasticsearchClient: any })
        .elasticsearchClient('count', esRequest)
        .then((resp: { count: number }) => resp.count);
    },
  };
}
