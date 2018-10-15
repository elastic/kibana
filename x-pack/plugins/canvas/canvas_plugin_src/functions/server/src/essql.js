/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, zipObject } from 'lodash';
import { normalizeType } from '../../../../server/lib/normalize_type';
import { buildBoolArray } from '../../../../server/lib/build_bool_array';
import { sanitizeName } from '../../../../server/lib/sanitize_name';

export const essql = () => ({
  name: 'essql',
  type: 'datatable',
  context: {
    types: ['filter'],
  },
  help: 'Elasticsearch SQL',
  args: {
    query: {
      aliases: ['_', 'q'],
      types: ['string'],
      help: 'SQL query',
    },
    count: {
      types: ['number'],
      default: 1000,
    },
  },
  fn(context, args, helpers) {
    return helpers
      .elasticsearchClient('transport.request', {
        path: '/_xpack/sql?format=json',
        method: 'POST',
        body: {
          fetch_size: args.count,
          query: args.query,
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
      })
      .catch(e => {
        if (e.message.indexOf('parsing_exception') > -1) {
          throw new Error(
            `Couldn't parse Elasticsearch SQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: ${
              e.message
            }`
          );
        }
        throw new Error(`Unexpected error from Elasticsearch: ${e.message}`);
      });
  },
});
