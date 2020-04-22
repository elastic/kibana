/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { map, zipObject } from 'lodash';
import { buildBoolArray } from './build_bool_array';
import { sanitizeName } from './sanitize_name';
import { normalizeType } from './normalize_type';

export const queryEsSQL = (elasticsearchClient, { count, query, filter, timezone }) =>
  elasticsearchClient('transport.request', {
    path: '/_sql?format=json',
    method: 'POST',
    body: {
      query,
      time_zone: timezone,
      fetch_size: count,
      client_id: 'canvas',
      filter: {
        bool: {
          must: [{ match_all: {} }, ...buildBoolArray(filter)],
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

      if (!!res.cursor) {
        elasticsearchClient('transport.request', {
          path: '/_sql/close',
          method: 'POST',
          body: {
            cursor: res.cursor,
          },
        }).catch(e => {
          throw new Error(`Unexpected error from Elasticsearch: ${e.message}`);
        });
      }

      return {
        type: 'datatable',
        columns,
        rows,
      };
    })
    .catch(e => {
      if (e.message.indexOf('parsing_exception') > -1) {
        throw new Error(
          `Couldn't parse Elasticsearch SQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: ${e.message}`
        );
      }
      throw new Error(`Unexpected error from Elasticsearch: ${e.message}`);
    });
