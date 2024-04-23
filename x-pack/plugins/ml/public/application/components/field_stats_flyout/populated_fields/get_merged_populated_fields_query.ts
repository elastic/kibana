/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { cloneDeep } from 'lodash';
import { getDefaultDSLQuery } from '@kbn/ml-query-utils';

export const getMergedSampleDocsForPopulatedFieldsQuery = ({
  runtimeFields,
  searchQuery,
  datetimeField,
  timeRange,
}: {
  runtimeFields: estypes.MappingRuntimeFields;
  searchQuery?: estypes.QueryDslQueryContainer;
  datetimeField?: string;
  timeRange?: TimeRangeMs;
}): {
  query: estypes.QueryDslQueryContainer;
  runtime_mappings?: estypes.MappingRuntimeFields;
} => {
  let rangeFilter;

  if (timeRange && datetimeField !== undefined) {
    if (isPopulatedObject(timeRange, ['from', 'to']) && timeRange.to > timeRange.from) {
      rangeFilter = {
        range: {
          [datetimeField]: {
            gte: timeRange.from,
            lte: timeRange.to,
            format: 'epoch_millis',
          },
        },
      };
    }
  }

  const query = cloneDeep(
    !searchQuery || isPopulatedObject(searchQuery, ['match_all'])
      ? getDefaultDSLQuery()
      : searchQuery
  );

  if (rangeFilter && isPopulatedObject<string, estypes.QueryDslBoolQuery>(query, ['bool'])) {
    if (Array.isArray(query.bool.filter)) {
      query.bool.filter.push(rangeFilter);
    } else {
      query.bool.filter = [rangeFilter];
    }
  }

  const queryAndRuntimeFields: {
    query: estypes.QueryDslQueryContainer;
    runtime_mappings?: estypes.MappingRuntimeFields;
  } = {
    query: {
      function_score: {
        query,
        // @ts-expect-error random_score is valid dsl query
        random_score: {},
      },
    },
  };
  if (runtimeFields) {
    queryAndRuntimeFields.runtime_mappings = runtimeFields;
  }
  return queryAndRuntimeFields;
};
