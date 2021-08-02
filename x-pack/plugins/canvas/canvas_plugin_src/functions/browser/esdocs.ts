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

// @ts-expect-error untyped local
import { buildESRequest } from '../../../common/lib/request/build_es_request';

import { StartDeps } from '../../../canvas_plugin_src/plugin';
import { ExpressionFunctionDefinitionFactory } from '../../../types';
import { ESSQL_SEARCH_STRATEGY } from '../../../common/lib/constants';
import { EssqlSearchStrategyRequest, EssqlSearchStrategyResponse } from '../../../types';
import { ELASTICSEARCH, LUCENE } from '../../../i18n/constants';

export interface Arguments {
  index: string;
  query: string;
  sort: string;
  fields: string;
  metaFields: string;
  count: number;
}

const strings = {
  help: i18n.translate('xpack.canvas.functions.esdocsHelpText', {
    defaultMessage:
      'Query {ELASTICSEARCH} for raw documents. Specify the fields you want to retrieve, ' +
      'especially if you are asking for a lot of rows.',
    values: {
      ELASTICSEARCH,
    },
  }),
  args: {
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
  },
};

type Fn = ExpressionFunctionDefinition<'esdocs', ExpressionValueFilter, Arguments, any>;

export const esdocsFactory: ExpressionFunctionDefinitionFactory<StartDeps, Fn> = ({
  startPlugins,
}) => {
  return function esdocs(): Fn {
    const { help, args: argHelp } = strings;

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
      fn: async (input, args, handlers) => {
        const { count, index, fields, sort } = args;

        input.and = input.and.concat([
          {
            type: 'filter',
            filterType: 'luceneQueryString',
            query: args.query,
            and: [],
          },
        ]);

        // Load ad-hoc to avoid adding to the page load bundle size
        const squel = await import('safe-squel');

        let query = squel.select({
          autoQuoteTableNames: true,
          autoQuoteFieldNames: true,
          autoQuoteAliasNames: true,
          nameQuoteCharacter: '"',
        });

        if (index) {
          query.from(index);
        }

        if (fields) {
          const allFields = fields.split(',').map((field) => field.trim());
          allFields.forEach((field) => (query = query.field(field)));
        }

        if (sort) {
          const [sortField, sortOrder] = sort.split(',').map((str) => str.trim());
          if (sortField) {
            query.order(`"${sortField}"`, sortOrder === 'asc');
          }
        }

        const { search } = startPlugins.data.search;

        const req = {
          count,
          query: query.toString(),
          filter: input.and,
        };

        // We're requesting the data using the ESSQL strategy because
        // the SQL routes return type information with the result set
        return search<EssqlSearchStrategyRequest, EssqlSearchStrategyResponse>(req, {
          strategy: ESSQL_SEARCH_STRATEGY,
        })
          .toPromise()
          .then((resp: EssqlSearchStrategyResponse) => {
            return {
              type: 'datatable',
              meta: {
                type: 'essql',
              },
              ...resp,
            };
          });
      },
    };
  };
};
