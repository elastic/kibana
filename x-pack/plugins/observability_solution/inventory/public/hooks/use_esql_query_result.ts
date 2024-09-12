/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AbortableAsyncState,
  useAbortableAsync,
} from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { lastValueFrom } from 'rxjs';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { ESQLRow, ESQLSearchResponse } from '@kbn/es-types';
import { ES_FIELD_TYPES, esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { Values } from '@kbn/utility-types';
import { excludeFrozenQuery } from '@kbn/observability-utils-common/es/queries/exclude_frozen_query';
import { kqlQuery } from '@kbn/observability-utils-common/es/queries/kql_query';
import { useKibana } from './use_kibana';

type EsFieldType = Values<typeof ES_FIELD_TYPES>;

export interface EsqlQueryResult {
  columns: Array<{
    id: string;
    name: string;
    meta: { type: DatatableColumnType; esType: EsFieldType };
  }>;
  rows: ESQLRow[];
}

export function useEsqlQueryResult({
  query,
  start,
  end,
  kqlFilter,
}: {
  query: string;
  start?: number;
  end?: number;
  kqlFilter?: string;
}): AbortableAsyncState<EsqlQueryResult> {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  return useAbortableAsync(
    async ({ signal }) => {
      return await lastValueFrom(
        data.search.search(
          {
            params: {
              query,
              dropNullColumns: true,
              filter: {
                bool: {
                  filter: [
                    ...(start && end
                      ? [
                          {
                            range: {
                              '@timestamp': {
                                gte: start,
                                lte: end,
                              },
                            },
                          },
                        ]
                      : []),
                    ...excludeFrozenQuery(),
                    ...kqlQuery(kqlFilter),
                  ],
                },
              },
            },
          },
          { strategy: ESQL_SEARCH_STRATEGY, abortSignal: signal }
        )
      ).then((searchResponse) => {
        const esqlResponse = searchResponse.rawResponse as unknown as ESQLSearchResponse;

        const columns =
          esqlResponse.columns?.map(({ name: columnName, type }) => ({
            id: columnName,
            name: columnName,
            meta: {
              type: esFieldTypeToKibanaFieldType(type) as DatatableColumnType,
              esType: type as EsFieldType,
            },
          })) ?? [];

        return {
          columns,
          rows: esqlResponse.values,
        };
      });
    },
    [query, data.search, start, end, kqlFilter]
  );
}
