/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import squel from 'squel';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions';
/* eslint-disable */
import { queryEsSQL } from '../../../server/lib/query_es_sql';
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

export function esdocs(): ExpressionFunctionDefinition<
  'esdocs',
  ExpressionValueFilter,
  Arguments,
  any
> {
  const { help, args: argHelp } = getFunctionHelp().esdocs;

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
    fn: (input, args, context) => {
      const { count, index, fields, sort } = args;

      input.and = input.and.concat([
        {
          type: 'filter',
          filterType: 'luceneQueryString',
          query: args.query,
          and: [],
        },
      ]);

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

      return queryEsSQL(((context as any) as { elasticsearchClient: any }).elasticsearchClient, {
        count,
        query: query.toString(),
        filter: input.and,
      });
    },
  };
}
