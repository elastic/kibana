/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../common/constants';

export const getAlertsCountQuery = (
  stackByField: string,
  from: string,
  to: string,
  additionalFilters: Array<{
    bool: { filter: unknown[]; should: unknown[]; must_not: unknown[]; must: unknown[] };
  }> = [],
  runtimeMappings?: MappingRuntimeFields
) => {
  return {
    size: 0,
    aggs: {
      alertsByGroupingCount: {
        terms: {
          field: stackByField,
          order: {
            _count: 'desc',
          },
          size: DEFAULT_MAX_TABLE_QUERY_SIZE,
        },
      },
    },
    query: {
      bool: {
        filter: [
          ...additionalFilters,
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
        ],
      },
    },
    runtime_mappings: runtimeMappings,
  };
};
