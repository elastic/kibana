/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { RuleParams, CountCriteria, ExecutionTimeRange } from '.';
import { buildFiltersFromCriteria, getContextAggregation } from './query_helpers';

export type LogThresholdRuleTypeParams = RuleParams;

export const getUngroupedESQuery = (
  params: Pick<RuleParams, 'timeSize' | 'timeUnit'> & { criteria: CountCriteria },
  timestampField: string,
  index: string,
  runtimeMappings: estypes.MappingRuntimeFields,
  executionTimeRange?: ExecutionTimeRange
): object => {
  const { rangeFilter, mustFilters, mustNotFilters } = buildFiltersFromCriteria(
    params,
    timestampField,
    executionTimeRange
  );

  const body: estypes.SearchRequest['body'] = {
    // Ensure we accurately track the hit count for the ungrouped case, otherwise we can only ensure accuracy up to 10,000.
    track_total_hits: true,
    query: {
      bool: {
        filter: [rangeFilter, ...mustFilters],
        ...(mustNotFilters.length > 0 && { must_not: mustNotFilters }),
      },
    },
    aggregations: {
      ...getContextAggregation(params),
    },
    runtime_mappings: runtimeMappings,
    size: 0,
  };

  return {
    index,
    allow_no_indices: true,
    ignore_unavailable: true,
    body,
  };
};
