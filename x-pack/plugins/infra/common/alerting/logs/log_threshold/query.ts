/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  RuleParams,
  CountCriteria,
  Criterion,
  hasGroupBy,
  isOptimizableGroupedThreshold,
  ExecutionTimeRange,
} from '.';
import { buildFiltersFromCriteria, positiveComparators } from './query_helpers';

export type LogThresholdRuleTypeParams = RuleParams;

export const COMPOSITE_GROUP_SIZE = 2000;

export const getESQuery = (
  alertParams: Omit<RuleParams, 'criteria'> & { criteria: CountCriteria },
  timestampField: string,
  indexPattern: string,
  runtimeMappings: estypes.MappingRuntimeFields,
  executionTimestamp: number
) => {
  const executionTimeRange = {
    lte: executionTimestamp,
  };
  return hasGroupBy(alertParams)
    ? getGroupedESQuery(
        alertParams,
        timestampField,
        indexPattern,
        runtimeMappings,
        executionTimeRange
      )
    : getUngroupedESQuery(
        alertParams,
        timestampField,
        indexPattern,
        runtimeMappings,
        executionTimeRange
      );
};

export const getGroupedESQuery = (
  params: Pick<RuleParams, 'timeSize' | 'timeUnit' | 'groupBy'> & {
    criteria: CountCriteria;
    count: {
      comparator: RuleParams['count']['comparator'];
      value?: RuleParams['count']['value'];
    };
  },
  timestampField: string,
  index: string,
  runtimeMappings: estypes.MappingRuntimeFields,
  executionTimeRange?: ExecutionTimeRange
): estypes.SearchRequest | undefined => {
  // IMPORTANT:
  // For the group by scenario we need to account for users utilizing "less than" configurations
  // to attempt to match on "0", e.g. something has stopped reporting. We need to cast a wider net for these
  // configurations to try and capture more documents, so that the filtering doesn't make the group "disappear".
  // Due to this there are two forks in the group by code, one where we can optimize the filtering early, and one where
  // it is an inner aggregation. "Less than" configurations with high cardinality group by fields can cause severe performance
  // problems.

  const {
    groupBy,
    count: { comparator, value },
  } = params;

  if (!groupBy || !groupBy.length) {
    return;
  }

  const { rangeFilter, groupedRangeFilter, mustFilters, mustNotFilters } = buildFiltersFromCriteria(
    params,
    timestampField,
    executionTimeRange
  );

  if (isOptimizableGroupedThreshold(comparator, value)) {
    const aggregations = {
      groups: {
        composite: {
          size: COMPOSITE_GROUP_SIZE,
          sources: groupBy.map((field, groupIndex) => ({
            [`group-${groupIndex}-${field}`]: {
              terms: { field },
            },
          })),
        },
        aggregations: {
          ...getContextAggregation(params),
        },
      },
    };

    const body: estypes.SearchRequest['body'] = {
      query: {
        bool: {
          filter: [rangeFilter, ...mustFilters],
          ...(mustNotFilters.length > 0 && { must_not: mustNotFilters }),
        },
      },
      aggregations,
      runtime_mappings: runtimeMappings,
      size: 0,
    };

    return {
      index,
      allow_no_indices: true,
      ignore_unavailable: true,
      body,
    };
  } else {
    const aggregations = {
      groups: {
        composite: {
          size: COMPOSITE_GROUP_SIZE,
          sources: groupBy.map((field, groupIndex) => ({
            [`group-${groupIndex}-${field}`]: {
              terms: { field },
            },
          })),
        },
        aggregations: {
          filtered_results: {
            filter: {
              bool: {
                // Scope the inner filtering back to the unpadded range
                filter: [rangeFilter, ...mustFilters],
                ...(mustNotFilters.length > 0 && { must_not: mustNotFilters }),
              },
            },
            aggregations: {
              ...getContextAggregation(params),
            },
          },
        },
      },
    };

    const body: estypes.SearchRequest['body'] = {
      query: {
        bool: {
          filter: [groupedRangeFilter],
        },
      },
      aggregations,
      runtime_mappings: runtimeMappings,
      size: 0,
    };

    return {
      index,
      allow_no_indices: true,
      ignore_unavailable: true,
      body,
    };
  }
};

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

const getContextAggregation = (
  params: Pick<RuleParams, 'groupBy'> & { criteria: CountCriteria }
) => {
  const validPrefixForContext = ['host', 'cloud', 'orchestrator', 'container', 'labels', 'tags'];
  const positiveCriteria = params.criteria.filter((criterion: Criterion) =>
    positiveComparators.includes(criterion.comparator)
  );

  const fieldsFromGroupBy = params.groupBy
    ? getFieldsSet(params.groupBy, validPrefixForContext)
    : new Set<string>();
  const fieldsFromCriteria = getFieldsSet(
    positiveCriteria.map((criterion: Criterion) => criterion.field),
    validPrefixForContext
  );
  const fieldsPrefixList = Array.from(
    new Set<string>([...fieldsFromGroupBy, ...fieldsFromCriteria])
  );
  const fieldsList = fieldsPrefixList.map((prefix) => (prefix === 'tags' ? prefix : `${prefix}.*`));

  const additionalContextAgg =
    fieldsList.length > 0
      ? {
          additionalContext: {
            top_hits: {
              size: 1,
              fields: fieldsList,
              _source: false,
            },
          },
        }
      : null;

  return additionalContextAgg;
};

const getFieldsSet = (groupBy: string[] | undefined, validPrefix: string[]): Set<string> => {
  return new Set<string>(
    groupBy
      ?.map((currentGroupBy) => currentGroupBy.split('.')[0])
      .filter((groupByPrefix) => validPrefix.includes(groupByPrefix))
  );
};
