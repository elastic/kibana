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
  index: string;
  query: string;
  sort: string;
  fields: string;
  metaFields: string;
  count: number;
}

const help = i18n.translate('xpack.canvas.functions.esdocsHelpText', {
  defaultMessage:
    'Query {ELASTICSEARCH} for raw documents. Specify the fields you want to retrieve, ' +
    'especially if you are asking for a lot of rows.',
  values: {
    ELASTICSEARCH,
  },
});

const argHelp = {
  query: i18n.translate('xpack.canvas.functions.esdocs.args.queryHelpText', {
    defaultMessage: 'A {LUCENE} query string.',
    values: {
      LUCENE,
    },
  }),
  count: i18n.translate('xpack.canvas.functions.esdocs.args.countHelpText', {
    defaultMessage:
      'The number of documents to retrieve. For better performance, use a smaller data set.',
  }),
  fields: i18n.translate('xpack.canvas.functions.esdocs.args.fieldsHelpText', {
    defaultMessage: 'A comma-separated list of fields. For better performance, use fewer fields.',
  }),
  index: i18n.translate('xpack.canvas.functions.esdocs.args.indexHelpText', {
    defaultMessage: 'An index or index pattern. For example, {example}.',
    values: {
      example: '`"logstash-*"`',
    },
  }),
  metaFields: i18n.translate('xpack.canvas.functions.esdocs.args.metaFieldsHelpText', {
    defaultMessage: 'Comma separated list of meta fields. For example, {example}.',
    values: {
      example: '`"_index,_type"`',
    },
  }),
  sort: i18n.translate('xpack.canvas.functions.esdocs.args.sortHelpText', {
    defaultMessage:
      'The sort direction formatted as {directions}. For example, {example1} or {example2}.',
    values: {
      directions: `\`"${['field', 'direction'].join(', ')}"\``,
      example1: `\`"${['@timestamp', 'desc'].join(', ')}"\``,
      example2: `\`"${['bytes', 'asc'].join(', ')}"\``,
    },
  }),
};

export function esdocs(): ExpressionFunctionDefinition<
  'esdocs',
  ExpressionValueFilter,
  Arguments,
  any
> {
  return {
    name: 'esdocs',
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
      count: {
        types: ['number'],
        default: 1000,
        help: argHelp.count,
      },
      fields: {
        help: argHelp.fields,
        types: ['string'],
      },
      index: {
        types: ['string'],
        default: '_all',
        help: argHelp.index,
      },
      // TODO: This arg isn't being used in the function.
      // We need to restore this functionality or remove it as an arg.
      metaFields: {
        help: argHelp.metaFields,
        types: ['string'],
      },
      sort: {
        types: ['string'],
        help: argHelp.sort,
      },
    },
    fn: async (input, args, context) => {
      const { esdocsFn } = await import('./fns');
      return await esdocsFn(input, args, context);
    },
  };
}
