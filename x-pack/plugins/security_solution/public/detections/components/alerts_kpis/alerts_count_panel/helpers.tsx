/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getOptionalSubAggregation } from '../../../../common/components/alerts_treemap/query';

export const DEFAULT_STACK_BY_FIELD0_SIZE = 1000;
export const DEFAULT_STACK_BY_FIELD1_SIZE = 1000;

export const getAlertsCountQuery = ({
  additionalFilters = [],
  from,
  runtimeMappings,
  stackByField0,
  stackByField1,
  to,
}: {
  additionalFilters: Array<{
    bool: { filter: unknown[]; should: unknown[]; must_not: unknown[]; must: unknown[] };
  }>;
  from: string;
  runtimeMappings?: MappingRuntimeFields;
  stackByField0: string;
  stackByField1: string | undefined;
  to: string;
}) => {
  return {
    size: 0,
    aggs: {
      stackByField0: {
        terms: {
          field: stackByField0,
          order: {
            _count: 'desc',
          },
          size: DEFAULT_STACK_BY_FIELD0_SIZE,
        },
        aggs: {
          ...getOptionalSubAggregation({
            stackByField1,
            stackByField1Size: DEFAULT_STACK_BY_FIELD1_SIZE,
          }),
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
