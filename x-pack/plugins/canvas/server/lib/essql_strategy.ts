/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import { map, zipObject } from 'lodash';

import { ISearchStrategy } from 'src/plugins/data/server';

import { getKbnServerError } from '../../../../../src/plugins/kibana_utils/server';
import { EssqlSearchStrategyRequest, EssqlSearchStrategyResponse } from '../../types';

import { buildBoolArray } from '../../common/lib/request/build_bool_array';
import { sanitizeName } from '../../common/lib/request/sanitize_name';
import { normalizeType } from '../../common/lib/request/normalize_type';

export const essqlSearchStrategyProvider = (): ISearchStrategy<
  EssqlSearchStrategyRequest,
  EssqlSearchStrategyResponse
> => {
  return {
    search: (request, options, { esClient }) => {
      const { count, query, filter, timezone, params } = request;

      const searchUntilEnd = async () => {
        try {
          let response = await esClient.asCurrentUser.sql.query(
            {
              format: 'json',
              body: {
                query,
                params,
                field_multi_value_leniency: true,
                time_zone: timezone,
                fetch_size: count,
                // @ts-expect-error `client_id` missing from `QuerySqlRequest` type
                client_id: 'canvas',
                filter: {
                  bool: {
                    must: [{ match_all: {} }, ...buildBoolArray(filter)],
                  },
                },
              },
            },
            { meta: true }
          );

          let body = response.body;

          const columns = body.columns!.map(({ name, type }) => {
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
            // @ts-expect-error previous ts-ignore mess with the signature override
            response = await esClient.asCurrentUser.sql.query(
              {
                format: 'json',
                body: {
                  cursor: body.cursor,
                },
              },
              { meta: true }
            );

            body = response.body;

            rows = [...rows, ...body.rows.map((row) => zipObject(columnNames, row))];
          }

          // If we used a cursor, clean it up
          if (body.cursor !== undefined) {
            await esClient.asCurrentUser.sql.clearCursor({
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
        } catch (e) {
          throw getKbnServerError(e);
        }
      };

      return from(searchUntilEnd());
    },
  };
};
