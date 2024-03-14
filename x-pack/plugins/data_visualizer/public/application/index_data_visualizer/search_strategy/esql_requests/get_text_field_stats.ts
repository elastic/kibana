/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseCancellableSearch } from '@kbn/ml-cancellable-search';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { Column } from '../../hooks/esql/use_esql_overall_stats_data';
import type { FieldExamples, FieldStatsError } from '../../../../../common/types/field_stats';

interface Params {
  runRequest: UseCancellableSearch['runRequest'];
  columns: Column[];
  esqlBaseQuery: string;
  filter?: QueryDslQueryContainer;
}

/**
 * Make one query that gets the top 10 rows for each text field requested
 * then process the values to showcase examples for each field
 * @param
 * @returns
 */
export const getESQLExampleFieldValues = async ({
  runRequest,
  columns: textFields,
  esqlBaseQuery,
  filter,
}: Params): Promise<Array<FieldExamples | FieldStatsError>> => {
  try {
    if (textFields.length > 0) {
      const request = {
        params: {
          query:
            esqlBaseQuery +
            `| KEEP ${textFields.map((f) => f.name).join(',')}
           | LIMIT 10`,
          ...(filter ? { filter } : {}),
        },
      };
      const textFieldsResp = await runRequest(request, { strategy: ESQL_SEARCH_STRATEGY });

      if (textFieldsResp) {
        return textFields.map((textField, idx) => {
          const examples = [
            ...new Set((textFieldsResp.rawResponse.values as unknown[][]).map((row) => row[idx])),
          ];

          return {
            fieldName: textField.name,
            examples,
          } as FieldExamples;
        });
      }
    }
  } catch (error) {
    return textFields.map((textField, idx) => ({
      fieldName: textField.name,
      error,
    })) as FieldStatsError[];
  }
  return [];
};
