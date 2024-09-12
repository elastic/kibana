/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { lastValueFrom } from 'rxjs';
import { ES_FIELD_TYPES, esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { ESQLRow, ESQLSearchResponse } from '@kbn/es-types';
import { ValuesType } from 'utility-types';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { excludeFrozenQuery } from '@kbn/observability-utils-common/es/queries/exclude_frozen_query';
import { kqlQuery } from '@kbn/observability-utils-common/es/queries/kql_query';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

type EsFieldType = ValuesType<typeof ES_FIELD_TYPES>;

export interface EsqlQueryResult {
  columns: Array<{
    id: string;
    name: string;
    meta: { type: DatatableColumnType; esType: EsFieldType };
  }>;
  rows: ESQLRow[];
}

export function runEsqlQuery({
  data,
  query,
  start,
  end,
  kqlFilter,
  dslFilter,
  signal,
}: {
  query: string;
  start?: number;
  end?: number;
  kqlFilter?: string;
  dslFilter?: QueryDslQueryContainer[];
  data: DataPublicPluginStart;
  signal: AbortSignal;
}): Promise<EsqlQueryResult> {
  return lastValueFrom(
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
                ...(dslFilter ?? []),
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
}
