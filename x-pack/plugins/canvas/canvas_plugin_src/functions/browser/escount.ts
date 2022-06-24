/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExpressionFunctionDefinition,
  ExpressionValueFilter,
} from '@kbn/expressions-plugin/common';

// @ts-expect-error untyped local
import { buildESRequest } from '../../../common/lib/request/build_es_request';

import { searchService } from '../../../public/services';

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
            track_total_hits: true,
            size: 0,
            query: {
              bool: {
                must: [{ match_all: {} }],
              },
            },
          },
        },
        input
      );

      const search = searchService.getService().search;
      const req = {
        params: {
          ...esRequest,
        },
      };

      return search
        .search(req)
        .toPromise()
        .then((resp: any) => {
          return resp.rawResponse.hits.total;
        });
    },
  };
}
