/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { map, zipObject } from 'lodash';
import { CallCluster } from '../../../../../src/legacy/core_plugins/elasticsearch';
import { buildBoolArray } from './build_bool_array';
import { GenericFilter } from './filters';
import { normalizeType } from './normalize_type';
import { sanitizeName } from './sanitize_name';

interface QueryParams {
  count: number;
  query: string;
  filter: GenericFilter[];
}

export const queryEsSQL = (
  elasticsearchClient: CallCluster,
  { count, query, filter }: QueryParams
) =>
  elasticsearchClient('transport.request', {
    path: '/_sql?format=json',
    method: 'POST',
    body: {
      fetch_size: count,
      query,
      client_id: 'canvas',
      filter: {
        bool: {
          must: [{ match_all: {} }, ...buildBoolArray(filter)],
        },
      },
    },
  })
    .then((res: { columns: Array<{ name: string; type: string }>; rows: any[] }) => {
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
    .catch((e: Error) => {
      if (e.message.indexOf('parsing_exception') > -1) {
        throw new Error(
          `Couldn't parse Elasticsearch SQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: ${
            e.message
          }`
        );
      }
      throw new Error(`Unexpected error from Elasticsearch: ${e.message}`);
    });
