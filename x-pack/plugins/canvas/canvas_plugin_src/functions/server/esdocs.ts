/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import squel from 'squel';
// @ts-ignore untyped local
import { queryEsSQL } from '../../../server/lib/query_es_sql';
import { ContextFunction, Filter } from '../types';

interface Arguments {
  index: string | null;
  query: string;
  sort: string | null;
  fields: string | null;
  metaFields: string | null;
  count: number;
}

export function esdocs(): ContextFunction<'esdocs', Filter, Arguments, any> {
  return {
    name: 'esdocs',
    type: 'datatable',
    help:
      'Query elasticsearch and get back raw documents. We recommend you specify the fields you want, ' +
      'especially if you are going to ask for a lot of rows',
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
        default: '-_index:.kibana',
      },
      sort: {
        types: ['string', 'null'],
        help: 'Sort directions as "field, direction". Eg "@timestamp, desc" or "bytes, asc"',
      },
      fields: {
        help: 'Comma separated list of fields. Fewer fields will perform better',
        types: ['string', 'null'],
      },
      metaFields: {
        help: 'Comma separated list of meta fields, eg "_index,_type"',
        types: ['string', 'null'],
      },
      count: {
        types: ['number'],
        default: 100,
        help: 'The number of docs to pull back. Smaller numbers perform better',
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
