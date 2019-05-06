/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore untyped local
import { buildESRequest } from '../../../server/lib/build_es_request';
import { ContextFunction, Filter } from '../types';

interface Arguments {
  index: string | null;
  query: string;
}

export function escount(): ContextFunction<'escount', Filter, Arguments, any> {
  return {
    name: 'escount',
    type: 'number',
    help: 'Query elasticsearch for a count of the number of hits matching a query',
    context: {
      types: ['filter'],
    },
    args: {
      index: {
        types: ['string', 'null'],
        default: '_all',
        help: 'Specify an index pattern. Eg "logstash-*"',
      },
      query: {
        types: ['string'],
        aliases: ['_', 'q'],
        help: 'A Lucene query string',
        default: '"-_index:.kibana"',
      },
    },
    fn: (context, args, handlers) => {
      context.and = context.and.concat([
        {
          type: 'luceneQueryString',
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
        context
      );

      return handlers
        .elasticsearchClient('count', esRequest)
        .then((resp: { count: number }) => resp.count);
    },
  };
}
