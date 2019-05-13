/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import squel from 'squel';
// @ts-ignore untyped local
import { queryEsSQL } from '../../../server/lib/query_es_sql';
import { ContextFunction, Filter } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  index: string | null;
  query: string;
  sort: string | null;
  fields: string | null;
  metaFields: string | null;
  count: number;
}

export function esdocs(): ContextFunction<'esdocs', Filter, Arguments, any> {
  const { help, args: argHelp } = getFunctionHelp().esdocs;

  return {
    name: 'esdocs',
    type: 'datatable',
    help,
    context: {
      types: ['filter'],
    },
    args: {
      index: {
        types: ['string', 'null'],
        default: '_all',
        help: argHelp.index,
      },
      query: {
        types: ['string'],
        aliases: ['_', 'q'],
        help: argHelp.query,
        default: '-_index:.kibana',
      },
      sort: {
        types: ['string', 'null'],
        help: argHelp.sort,
      },
      fields: {
        help: argHelp.fields,
        types: ['string', 'null'],
      },
      metaFields: {
        help: argHelp.metaFields,
        types: ['string', 'null'],
      },
      count: {
        types: ['number'],
        default: 100,
        help: argHelp.count,
      },
    },
    fn: (context, args, handlers) => {
      const { count, index, fields, sort } = args;

      context.and = context.and.concat([
        {
          type: 'luceneQueryString',
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
        query.from(index.toLowerCase());
      }

      if (fields) {
        const allFields = fields.split(',').map(field => field.trim());
        allFields.forEach(field => (query = query.field(field)));
      }

      if (sort) {
        const [sortField, sortOrder] = sort.split(',').map(str => str.trim());
        if (sortField) {
          query.order(`"${sortField}"`, sortOrder.toLowerCase() === 'asc');
        }
      }

      return queryEsSQL(handlers.elasticsearchClient, {
        count,
        query: query.toString(),
        filter: context.and,
      });
    },
  };
}
