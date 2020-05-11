/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions';
/* eslint-disable */
// @ts-ignore untyped local
import { queryEsDSL } from '../../../server/lib/query_es_dsl';
/* eslint-enable */
import { ExpressionValueFilter } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  index: string;
  query: string;
  sort: string;
  fields: string;
  metaFields: string;
  count: number;
}

export function esdsl(): ExpressionFunctionDefinition<
  'esdsl',
  ExpressionValueFilter,
  Arguments,
  any
> {
  const { help, args: argHelp } = getFunctionHelp().esdocs;

  return {
    name: 'esdsl',
    type: 'datatable',
    context: {
      types: ['filter'],
    },
    help,
    args: {
      query: {
        types: ['string'],
        aliases: ['_', 'q'],
        help: argHelp.query,
        default: '-_index:.kibana',
      },
      index: {
        types: ['string'],
        default: '_all',
        help: argHelp.index,
      },
    },
    fn: (input, args, context) => {
      const { index, query } = args;

      return queryEsDSL(((context as any) as { elasticsearchClient: any }).elasticsearchClient, {
        index,
        query,
        filter: input,
      });
    },
  };
}
