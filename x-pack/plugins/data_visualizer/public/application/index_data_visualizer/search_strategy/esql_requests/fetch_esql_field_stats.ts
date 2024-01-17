/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_SEARCH_STRATEGY, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { AggregateQuery } from '@kbn/es-query';
import type { Column } from '../../hooks/use_esql_data';
import { processDistributionData } from '../../utils/process_distribution_data';
import { PERCENTILE_SPACING } from '../requests/constants';
import { escapeESQL, getESQLPercentileQueryArray } from '../requests/esql_utils';

type RunRequest = <RequestBody, ResponseType extends IKibanaSearchResponse<any>>(
  requestBody: RequestBody,
  options?: {}
) => Promise<ResponseType | null>;

export const fetchNumericFieldStats = async ({
  runRequest,
  columns,
  esqlBaseQuery,
  filter,
}: {
  runRequest: RunRequest;
  columns: Column[];
  esqlBaseQuery?: string;
  filter?: QueryDslQueryContainer;
}) => {
  const numericFields = columns
    .filter((f) => f.secondaryType === 'number')
    .map((field, idx) => {
      const percentiles = getESQLPercentileQueryArray(field.name);
      // idx * 23 + 0
      /**
       * 0 = min; 23
       * 1 = max; 24
       * 2 p0; 25
       * 3 p5; 26
       * 4 p10
       * ...
       * 22 p100
       */
      return {
        field,
        query: `${escapeESQL(`${field.name}_min`)} = MIN(${escapeESQL(field.name)}),
    ${escapeESQL(`${field.name}_max`)} = MAX(${escapeESQL(field.name)}),
  ${percentiles.join(',')}
  `,
        startIndex: idx * (percentiles.length + 2),
      };
    });
  console.log('numericFields', numericFields);

  if (numericFields.length > 0) {
    const numericStatsQuery = '| STATS ' + numericFields.map(({ query }) => query).join(',');

    const fieldStatsResp = await runRequest(
      {
        params: {
          query: esqlBaseQuery + numericStatsQuery,
          ...(filter ? { filter } : {}),
        },
      },
      { strategy: ESQL_SEARCH_STRATEGY }
    );

    if (fieldStatsResp) {
      const values = fieldStatsResp.rawResponse.values[0];

      return numericFields.map(({ field, startIndex }, idx) => {
        const min = values[startIndex + 0];
        const max = values[startIndex + 1];
        const median = values[startIndex + 12];

        const percentiles = values
          .slice(startIndex + 2, startIndex + 23)
          .map((value: number) => ({ value }));

        const distribution = processDistributionData(percentiles, PERCENTILE_SPACING, min);
        return {
          fieldName: field.name,
          ...field,
          min,
          max,
          median,
          distribution,
        };
      });
    }
  }
};
