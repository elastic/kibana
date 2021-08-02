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
import { i18n } from '@kbn/i18n';

import { StartDeps } from '../../../canvas_plugin_src/plugin';
import { ExpressionFunctionDefinitionFactory } from '../../../types';
import { ELASTICSEARCH, LUCENE } from '../../../i18n/constants';

// @ts-expect-error untyped local
import { buildESRequest } from '../../../common/lib/request/build_es_request';

export interface Arguments {
  index: string | null;
  query: string;
}

const strings = {
  help: i18n.translate('xpack.canvas.functions.escountHelpText', {
    defaultMessage: 'Query {ELASTICSEARCH} for the number of hits matching the specified query.',
    values: {
      ELASTICSEARCH,
    },
  }),
  args: {
    query: i18n.translate('xpack.canvas.functions.escount.args.queryHelpText', {
      defaultMessage: 'A {LUCENE} query string.',
      values: {
        LUCENE,
      },
    }),
    index: i18n.translate('xpack.canvas.functions.escount.args.indexHelpText', {
      defaultMessage: 'An index or index pattern. For example, {example}.',
      values: {
        example: '`"logstash-*"`',
      },
    }),
  },
};

type Fn = ExpressionFunctionDefinition<'escount', ExpressionValueFilter, Arguments, any>;

export const escountFactory: ExpressionFunctionDefinitionFactory<StartDeps, Fn> = ({
  startPlugins,
}) => {
  return function escount(): Fn {
    const { help, args: argHelp } = strings;

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
      fn: (input, args, _handlers) => {
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

        const { search } = startPlugins.data.search;
        const req = {
          params: {
            ...esRequest,
          },
        };

        return search(req)
          .toPromise()
          .then((resp: any) => {
            return resp.rawResponse.hits.total;
          });
      },
    };
  };
};
