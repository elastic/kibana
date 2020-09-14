/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { map, zipObject } from 'lodash';
import { buildBoolArray } from './build_bool_array';
import { sanitizeName } from './sanitize_name';
import { normalizeType } from './normalize_type';
import { LegacyAPICaller } from '../../../../../src/core/server';
import { ExpressionValueFilter } from '../../types';

interface Args {
  count: number;
  query: string;
  timezone?: string;
  filter: ExpressionValueFilter[];
}

interface CursorResponse {
  cursor?: string;
  rows: string[][];
}

type QueryResponse = CursorResponse & {
  columns: Array<{
    name: string;
    type: string;
  }>;
  cursor?: string;
  rows: string[][];
};

export const queryEsSQL = async (
  elasticsearchClient: LegacyAPICaller,
  { count, query, filter, timezone }: Args
) => {
  try {
    let response: QueryResponse = await elasticsearchClient<QueryResponse>('transport.request', {
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
    });

    const columns = response.columns.map(({ name, type }) => {
      return {
        id: sanitizeName(name),
        name: sanitizeName(name),
        meta: { type: normalizeType(type) },
      };
    });
    const columnNames = map(columns, 'name');
    let rows = response.rows.map((row) => zipObject(columnNames, row));

    while (rows.length < count && response.cursor !== undefined) {
      response = await elasticsearchClient<QueryResponse>('transport.request', {
        path: '/_sql?format=json',
        method: 'POST',
        body: {
          cursor: response.cursor,
        },
      });

      rows = [...rows, ...response.rows.map((row) => zipObject(columnNames, row))];
    }

    if (response.cursor !== undefined) {
      elasticsearchClient('transport.request', {
        path: '/_sql/close',
        method: 'POST',
        body: {
          cursor: response.cursor,
        },
      });
    }

    return {
      type: 'datatable',
      meta: {
        type: 'essql',
      },
      columns,
      rows,
    };
  } catch (e) {
    if (e.message.indexOf('parsing_exception') > -1) {
      throw new Error(
        `Couldn't parse Elasticsearch SQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: ${e.message}`
      );
    }
    throw new Error(`Unexpected error from Elasticsearch: ${e.message}`);
  }
};
