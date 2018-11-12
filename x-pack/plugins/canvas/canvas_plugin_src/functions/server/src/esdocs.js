/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import squel from 'squel';
import { map, zipObject } from 'lodash';
import { buildBoolArray } from '../../../../server/lib/build_bool_array';
import { normalizeType } from '../../../../server/lib/normalize_type';
import { sanitizeName } from '../../../../server/lib/sanitize_name';

export const esdocs = () => ({
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
    context.and = context.and.concat([
      {
        type: 'luceneQueryString',
        query: args.query,
      },
    ]);

    let query = squel
      .select({
        autoQuoteTableNames: true,
        autoQuoteFieldNames: true,
        autoQuoteAliasNames: true,
        nameQuoteCharacter: '"',
      })
      .from(args.index.toLowerCase());

    if (args.fields) {
      const fields = args.fields.split(',').map(field => field.trim());
      fields.forEach(field => (query = query.field(field)));
    }

    if (args.sort) {
      const [sortField, sortOrder] = args.sort.split(',').map(str => str.trim());
      if (sortField) query.order(`"${sortField}"`, sortOrder.toLowerCase() === 'asc');
    }

    return handlers
      .elasticsearchClient('transport.request', {
        path: '/_xpack/sql?format=json',
        method: 'POST',
        body: {
          fetch_size: args.count,
          query: query.toString(),
          filter: {
            bool: {
              must: [{ match_all: {} }, ...buildBoolArray(context.and)],
            },
          },
        },
      })
      .then(res => {
        const columns = res.columns.map(({ name, type }) => {
          return { name: sanitizeName(name), type: normalizeType(type) };
        });
        const columnNames = map(columns, 'name');
        const rows = res.rows.map(row => zipObject(columnNames, row));
        return {
          type: 'datatable',
          columns,
          rows,
        };
      });
  },
});
