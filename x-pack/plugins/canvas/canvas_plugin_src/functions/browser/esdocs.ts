/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { zipObject } from 'lodash';
import {
  Datatable,
  ExpressionFunctionDefinition,
  ExpressionValueFilter,
} from '@kbn/expressions-plugin/common';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import {
  SqlRequestParams,
  SqlSearchStrategyRequest,
  SqlSearchStrategyResponse,
  SQL_SEARCH_STRATEGY,
} from '@kbn/data-plugin/common';

import { searchService } from '../../../public/services';
import { getFunctionHelp } from '../../../i18n';
import { buildBoolArray } from '../../../common/lib/request/build_bool_array';
import { normalizeType } from '../../../common/lib/request/normalize_type';

interface Arguments {
  index: string;
  query: string;
  sort: string;
  fields: string;
  metaFields: string;
  count: number;
}

function sanitize(value: string) {
  return value.replace(/[\(\)]/g, '_');
}

export function esdocs(): ExpressionFunctionDefinition<
  'esdocs',
  ExpressionValueFilter,
  Arguments,
  Observable<Datatable>
> {
  const { help, args: argHelp } = getFunctionHelp().esdocs;

  return {
    name: 'esdocs',
    type: 'datatable',
    context: {
      types: ['filter'],
    },
    help,
    args: {
      query: {
        types: ['string'],
        aliases: ['_', 'q'],
        help: argHelp.query,
        default: '-_index:.kibana',
      },
      count: {
        types: ['number'],
        default: 1000,
        help: argHelp.count,
      },
      fields: {
        help: argHelp.fields,
        types: ['string'],
      },
      index: {
        types: ['string'],
        aliases: ['dataView'],
        default: '_all',
        help: argHelp.index,
      },
      // TODO: This arg isn't being used in the function.
      // We need to restore this functionality or remove it as an arg.
      metaFields: {
        help: argHelp.metaFields,
        types: ['string'],
      },
      sort: {
        types: ['string'],
        help: argHelp.sort,
      },
    },
    fn(input, args, { abortSignal }) {
      // Load ad-hoc to avoid adding to the page load bundle size
      return from(import('safe-squel')).pipe(
        switchMap((squel) => {
          const { count, index, fields, sort } = args;

          let query = squel.select({
            autoQuoteTableNames: true,
            autoQuoteFieldNames: true,
            autoQuoteAliasNames: true,
            nameQuoteCharacter: '"',
          });

          if (index) {
            query.from(index);
          }

          if (fields) {
            const allFields = fields.split(',').map((field) => field.trim());
            allFields.forEach((field) => (query = query.field(field)));
          }

          if (sort) {
            const [sortField, sortOrder] = sort.split(',').map((str) => str.trim());
            if (sortField) {
              query.order(`"${sortField}"`, sortOrder === 'asc');
            }
          }

          const params: SqlRequestParams = {
            query: query.toString(),
            fetch_size: count,
            field_multi_value_leniency: true,
            filter: {
              bool: {
                must: [
                  { match_all: {} },
                  ...buildBoolArray([
                    ...input.and,
                    {
                      type: 'filter',
                      filterType: 'luceneQueryString',
                      query: args.query,
                      and: [],
                    },
                  ]),
                ],
              },
            },
          };

          const search = searchService.getService().search;

          return search.search<SqlSearchStrategyRequest, SqlSearchStrategyResponse>(
            { params },
            { abortSignal, strategy: SQL_SEARCH_STRATEGY }
          );
        }),
        catchError((error) => {
          if (!error.err) {
            error.message = `Unexpected error from Elasticsearch: ${error.message}`;
          } else {
            const { type, reason } = error.err.attributes;
            error.message =
              type === 'parsing_exception'
                ? `Couldn't parse Elasticsearch SQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: ${reason}`
                : `Unexpected error from Elasticsearch: ${type} - ${reason}`;
          }

          return throwError(() => error);
        }),
        map(({ rawResponse: body }) => {
          const columns =
            body.columns?.map(({ name, type }) => ({
              id: sanitize(name),
              name: sanitize(name),
              meta: { type: normalizeType(type) },
            })) ?? [];
          const columnNames = columns.map(({ name }) => name);
          const rows = body.rows.map((row) => zipObject(columnNames, row));

          return {
            type: 'datatable',
            meta: {
              type: 'essql',
            },
            columns,
            rows,
          } as Datatable;
        })
      );
    },
  };
}
