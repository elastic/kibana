/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, zipObject } from 'lodash';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { lastValueFrom } from 'rxjs';
import { buildEsQuery } from '@kbn/es-query';
import {
  getEsQueryConfig,
  KibanaContext,
  SqlRequestParams,
  SqlSearchStrategyRequest,
  SqlSearchStrategyResponse,
  SQL_SEARCH_STRATEGY,
} from '@kbn/data-plugin/common';
import { searchService } from '../../../public/services';
import { getFunctionHelp } from '../../../i18n';
import { sanitizeName } from '@kbn/canvas-plugin/common/lib/request/sanitize_name';
import { normalizeType } from '@kbn/canvas-plugin/common/lib/request/normalize_type';

interface Arguments {
  query: string;
  parameter: Array<string | number | boolean>;
  count: number;
  timezone: string;
}

export function essql(): ExpressionFunctionDefinition<'essql', KibanaContext, Arguments, any> {
  const { help, args: argHelp } = getFunctionHelp().essql;

  return {
    name: 'essql',
    type: 'datatable',
    context: {
      types: ['kibana_context'],
    },
    help,
    args: {
      query: {
        aliases: ['_', 'q'],
        types: ['string'],
        help: argHelp.query,
      },
      parameter: {
        aliases: ['param'],
        types: ['string', 'number', 'boolean'],
        multi: true,
        help: argHelp.parameter,
      },
      count: {
        types: ['number'],
        help: argHelp.count,
        default: 1000,
      },
      timezone: {
        aliases: ['tz'],
        types: ['string'],
        default: 'UTC',
        help: argHelp.timezone,
      },
    },
    fn: (input, args, handlers) => {
      const search = searchService.getService().search;
      const { parameter, timezone, count, query } = args;
      const req = {
        query,
        fetch_size: count,
        time_zone: timezone,
        params: parameter as SqlRequestParams,
        filter: buildEsQuery(
          undefined,
          input.query || [],
          // we need to convert timeRange to filter and add it here
          input.filters || []
          /*, getEsQueryConfig({ get: getConfig })*/
        ),
        field_multi_value_leniency: true,
      };

      return lastValueFrom(
        search.search<SqlSearchStrategyRequest, SqlSearchStrategyResponse>({ params: req }, {
          strategy: SQL_SEARCH_STRATEGY,
        })
      )
        .then((resp: SqlSearchStrategyResponse) => {
          debugger;

          let body = resp.rawResponse;

          const columns = body.columns!.map(({ name, type }) => {
            return {
              id: sanitizeName(name),
              name: sanitizeName(name),
              meta: { type: normalizeType(type) },
            };
          });
          const columnNames = map(columns, 'name');
          const rows = body.rows.map((row) => zipObject(columnNames, row));

          return {
            type: 'datatable',
            meta: {
              type: 'essql',
            },
            columns,
            rows,
          };
        })
        .catch((e) => {
          let message = `Unexpected error from Elasticsearch: ${e.message}`;
          if (e.err) {
            const { type, reason } = e.err.attributes;
            if (type === 'parsing_exception') {
              message = `Couldn't parse Elasticsearch SQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: ${reason}`;
            } else {
              message = `Unexpected error from Elasticsearch: ${type} - ${reason}`;
            }
          }

          // Re-write the error message before surfacing it up
          e.message = message;
          throw e;
        });
    },
  };
}
