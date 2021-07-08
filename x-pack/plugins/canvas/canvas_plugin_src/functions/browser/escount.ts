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
import { ELASTICSEARCH, LUCENE } from '../../../i18n/constants';

interface Arguments {
  index: string | null;
  query: string;
}

const help = i18n.translate('xpack.canvas.functions.escountHelpText', {
  defaultMessage: 'Query {ELASTICSEARCH} for the number of hits matching the specified query.',
  values: {
    ELASTICSEARCH,
  },
});

const argHelp = {
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
};

export function escount(): ExpressionFunctionDefinition<
  'escount',
  ExpressionValueFilter,
  Arguments,
  any
> {
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
    fn: async (input, args, context) => {
      const { escountFn } = await import('./fns');
      return await escountFn(input, args, context);
    },
  };
}
