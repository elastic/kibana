/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import { map, zipObject } from 'lodash';

import { ISearchStrategy, PluginStart } from 'src/plugins/data/server';

import { getKbnServerError } from '../../../../../src/plugins/kibana_utils/server';
import { EssqlSearchStrategyRequest, EssqlSearchStrategyResponse } from '../../types';

import { buildBoolArray } from '../../common/lib/request/build_bool_array';
import { sanitizeName } from '../../common/lib/request/sanitize_name';
import { normalizeType } from '../../common/lib/request/normalize_type';
import {
  SQL_SEARCH_STRATEGY,
  SqlSearchStrategyRequest,
  SqlSearchStrategyResponse,
} from '../../../../../src/plugins/data/common';

export const essqlSearchStrategyProvider = (
  data: PluginStart
): ISearchStrategy<EssqlSearchStrategyRequest, EssqlSearchStrategyResponse> => {
  return {
    search: (request, options, deps) => {
      const { count, query, filter, timezone, params } = request;

      // TODO: improve data.search types
      const sqlSearch = data.search.getSearchStrategy(
        SQL_SEARCH_STRATEGY
      ) as unknown as ISearchStrategy<SqlSearchStrategyRequest, SqlSearchStrategyResponse>;

      const searchUntilEnd = async () => {
        try {
          let response = await sqlSearch
            .search(
              {
                params: {
                  query,
                  params,
                  field_multi_value_leniency: true,
                  time_zone: timezone,
                  fetch_size: count,
                  filter: {
                    bool: {
                      must: [{ match_all: {} }, ...buildBoolArray(filter)],
                    },
                  },
                },
              },
              {},
              deps
            )
            .toPromise();

          let body = response.rawResponse;

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
            response = await sqlSearch
              .search(
                {
                  params: {
                    cursor: body.cursor,
                  },
                },
                {},
                deps
              )
              .toPromise();

            body = response.rawResponse;

            rows = [...rows, ...body.rows.map((row) => zipObject(columnNames, row))];
          }

          // If we used a cursor, clean it up
          if (body.cursor !== undefined) {
            await deps.esClient.asCurrentUser.sql.clearCursor({
              body: {
                cursor: body.cursor,
              },
            });
          }

          return {
            columns,
            rows,
            rawResponse: response.rawResponse,
          };
        } catch (e) {
          throw getKbnServerError(e);
        }
      };

      return from(searchUntilEnd());
    },
  };
};
