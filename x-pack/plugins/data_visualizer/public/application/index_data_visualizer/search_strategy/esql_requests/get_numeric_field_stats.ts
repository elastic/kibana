/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseCancellableSearch } from '@kbn/ml-cancellable-search';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { chunk } from 'lodash';
import pLimit from 'p-limit';
import type { Column } from '../../hooks/esql/use_esql_overall_stats_data';
import { processDistributionData } from '../../utils/process_distribution_data';
import { PERCENTILE_SPACING } from '../requests/constants';
import { getESQLPercentileQueryArray, getSafeESQLName } from '../requests/esql_utils';
import { isFulfilled } from '../../../common/util/promise_all_settled_utils';
import { MAX_CONCURRENT_REQUESTS } from '../../constants/index_data_visualizer_viewer';

interface Params {
  runRequest: UseCancellableSearch['runRequest'];
  columns: Column[];
  esqlBaseQuery: string;
  filter?: QueryDslQueryContainer;
}
const getESQLNumericFieldStatsInChunk = async ({
  runRequest,
  columns,
  esqlBaseQuery,
  filter,
}: Params) => {
  const numericFields = columns.map((field, idx) => {
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
      query: `${getSafeESQLName(`${field.name}_min`)} = MIN(${getSafeESQLName(field.name)}),
    ${getSafeESQLName(`${field.name}_max`)} = MAX(${getSafeESQLName(field.name)}),
  ${percentiles.join(',')}
  `,
      startIndex: idx * (percentiles.length + 2),
    };
  });

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
    return [];
  }
};

export const getESQLNumericFieldStats = async ({
  runRequest,
  columns,
  esqlBaseQuery,
  filter,
}: Params) => {
  const limiter = pLimit(MAX_CONCURRENT_REQUESTS);

  // Breakdown so that each requests only contains 10 numeric fields
  // to prevent potential circuit breaking exception
  // or too big of a payload
  const numericColumnChunks = chunk(columns, 10);
  const numericStats = await Promise.allSettled(
    numericColumnChunks.map((numericColumns) =>
      limiter(() =>
        getESQLNumericFieldStatsInChunk({
          columns: numericColumns,
          filter,
          runRequest,
          esqlBaseQuery,
        })
      )
    )
  );
  return numericStats.filter(isFulfilled).flatMap((stat) => stat.value);
};
