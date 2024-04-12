/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseCancellableSearch } from '@kbn/ml-cancellable-search';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { ESQL_LATEST_VERSION } from '@kbn/esql-utils';
import type { Column } from '../../hooks/esql/use_esql_overall_stats_data';
import { getSafeESQLName } from '../requests/esql_utils';
import type { DateFieldStats, FieldStatsError } from '../../../../../common/types/field_stats';

interface Params {
  runRequest: UseCancellableSearch['runRequest'];
  columns: Column[];
  esqlBaseQuery: string;
  filter?: QueryDslQueryContainer;
}

export const getESQLDateFieldStats = async ({
  runRequest,
  columns,
  esqlBaseQuery,
  filter,
}: Params) => {
  const dateFields = columns.map((field) => {
    return {
      field,
      query: `${getSafeESQLName(`${field.name}_earliest`)} = MIN(${getSafeESQLName(
        field.name
      )}), ${getSafeESQLName(`${field.name}_latest`)} = MAX(${getSafeESQLName(field.name)})`,
    };
  });

  if (dateFields.length > 0) {
    const dateStatsQuery = ' | STATS ' + dateFields.map(({ query }) => query).join(',');
    const request = {
      params: {
        query: esqlBaseQuery + dateStatsQuery,
        ...(filter ? { filter } : {}),
        version: ESQL_LATEST_VERSION,
      },
    };
    try {
      const dateFieldsResp = await runRequest(request, { strategy: ESQL_SEARCH_STRATEGY });

      if (dateFieldsResp) {
        return dateFields.map(({ field: dateField }, idx) => {
          const row = dateFieldsResp.rawResponse.values[0] as Array<null | string | number>;

          const earliest = row[idx * 2];
          const latest = row[idx * 2 + 1];

          return {
            fieldName: dateField.name,
            earliest,
            latest,
          } as DateFieldStats;
        });
      }
    } catch (error) {
      // Log for debugging purposes
      // eslint-disable-next-line no-console
      console.error(error, request);
      return dateFields.map(({ field }, idx) => {
        return {
          fieldName: field.name,
          error,
        } as FieldStatsError;
      });
    }
  }
  return [];
};
