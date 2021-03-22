/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import { map, zipObject } from 'lodash';

import { ISearchStrategy, PluginStart } from 'src/plugins/data/server';

import { EssqlSearchStrategyRequest, EssqlSearchStrategyResponse } from '../../../types';

import { buildBoolArray } from './build_bool_array';
import { sanitizeName } from './sanitize_name';
import { normalizeType } from './normalize_type';
interface CursorResponse {
  cursor?: string;
  rows: string[][];
}

type QueryResponse = CursorResponse & {
  columns: Array<{
    name: string;
    type: string;
  }>;
};

export const essqlSearchStrategyProvider = (
  data: PluginStart
): ISearchStrategy<EssqlSearchStrategyRequest, EssqlSearchStrategyResponse> => {
  return {
    search: (request, options, { esClient }) => {
      const { count, query, filter, timezone, params } = request;

      const searchUntilEnd = async () => {
        let response = await esClient.asCurrentUser.transport.request({
          path: '/_sql?format=json',
          method: 'POST',
          body: {
            query,
            params,
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
        let body = response.body as QueryResponse;

        const columns = body.columns.map(({ name, type }) => {
          return {
            id: sanitizeName(name),
            name: sanitizeName(name),
            meta: { type: normalizeType(type) },
          };
        });
        const columnNames = map(columns, 'name');
        let rows = body.rows.map((row) => zipObject(columnNames, row));

        // If we still have rows to retrieve, continue requesting data
        // using the cursor until we have everything
        while (rows.length < count && body.cursor !== undefined) {
          response = await esClient.asCurrentUser.transport.request({
            path: '/_sql?format=json',
            method: 'POST',
            body: {
              cursor: body.cursor,
            },
          });

          body = response.body as QueryResponse;

          rows = [...rows, ...body.rows.map((row) => zipObject(columnNames, row))];
        }

        // If we used a cursor, clean it up
        if (body.cursor !== undefined) {
          await esClient.asCurrentUser.transport.request({
            path: '/_sql/close',
            method: 'POST',
            body: {
              cursor: body.cursor,
            },
          });
        }

        return {
          columns,
          rows,
          rawResponse: response,
        };
      };

      return from(searchUntilEnd());
    },
  };
};
