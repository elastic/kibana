/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  Comparator,
  CountCriteria,
  Criterion,
  ExecutionTimeRange,
  RuleParams,
  hasGroupBy,
  isOptimizableGroupedThreshold,
} from '../../../../../common/alerting/logs/log_threshold';
import { getIntervalInSeconds } from '../../../../../common/utils/get_interval_in_seconds';

const COMPOSITE_GROUP_SIZE = 2000;

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

export const buildFiltersFromCriteria = (
  params: Pick<RuleParams, 'timeSize' | 'timeUnit'> & { criteria: CountCriteria },
  timestampField: string,
  executionTimeRange?: ExecutionTimeRange
) => {
  const { timeSize, timeUnit, criteria } = params;
  const interval = `${timeSize}${timeUnit}`;
  const intervalAsSeconds = getIntervalInSeconds(interval);
  const intervalAsMs = intervalAsSeconds * 1000;
  const to = executionTimeRange?.lte || Date.now();
  const from = executionTimeRange?.gte || to - intervalAsMs;

  const positiveCriteria = criteria.filter((criterion) =>
    positiveComparators.includes(criterion.comparator)
  );
  const negativeCriteria = criteria.filter((criterion) =>
    negativeComparators.includes(criterion.comparator)
  );
  // Positive assertions (things that "must" match)
  const mustFilters = buildFiltersForCriteria(positiveCriteria);
  // Negative assertions (things that "must not" match)
  const mustNotFilters = buildFiltersForCriteria(negativeCriteria);

  const rangeFilter = {
    range: {
      [timestampField]: {
        gte: from,
        lte: to,
        format: 'epoch_millis',
      },
    },
  };

  // For group by scenarios we'll pad the time range by 1 x the interval size on the left (lte) and right (gte), this is so
  // a wider net is cast to "capture" the groups. This is to account for scenarios where we want ascertain if
  // there were "no documents" (less than 1 for example). In these cases we may be missing documents to build the groups
  // and match / not match the criteria.
  const groupedRangeFilter = {
    range: {
      [timestampField]: {
        gte: from - intervalAsMs,
        lte: to + intervalAsMs,
        format: 'epoch_millis',
      },
    },
  };

  return { rangeFilter, groupedRangeFilter, mustFilters, mustNotFilters };
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

const buildFiltersForCriteria = (criteria: CountCriteria) => {
  let filters: estypes.QueryDslQueryContainer[] = [];

  criteria.forEach((criterion) => {
    const criterionQuery = buildCriterionQuery(criterion);
    if (criterionQuery) {
      filters = [...filters, criterionQuery];
    }
  });
  return filters;
};

const buildCriterionQuery = (criterion: Criterion): estypes.QueryDslQueryContainer | undefined => {
  const { field, value, comparator } = criterion;

  const queryType = getQueryMappingForComparator(comparator);

  switch (queryType) {
    case 'term':
      return {
        term: {
          [field]: {
            value,
          },
        },
      };
    case 'match': {
      return {
        match: {
          [field]: value,
        },
      };
    }
    case 'match_phrase': {
      return {
        match_phrase: {
          [field]: String(value),
        },
      };
    }
    case 'range': {
      const comparatorToRangePropertyMapping: {
        [key: string]: string;
      } = {
        [Comparator.LT]: 'lt',
        [Comparator.LT_OR_EQ]: 'lte',
        [Comparator.GT]: 'gt',
        [Comparator.GT_OR_EQ]: 'gte',
      };

      const rangeProperty = comparatorToRangePropertyMapping[comparator];

      return {
        range: {
          [field]: {
            [rangeProperty]: value,
          },
        },
      };
    }
    default: {
      return undefined;
    }
  }
};

export const positiveComparators = [
  Comparator.GT,
  Comparator.GT_OR_EQ,
  Comparator.LT,
  Comparator.LT_OR_EQ,
  Comparator.EQ,
  Comparator.MATCH,
  Comparator.MATCH_PHRASE,
];

export const negativeComparators = [
  Comparator.NOT_EQ,
  Comparator.NOT_MATCH,
  Comparator.NOT_MATCH_PHRASE,
];

export const queryMappings: {
  [key: string]: string;
} = {
  [Comparator.GT]: 'range',
  [Comparator.GT_OR_EQ]: 'range',
  [Comparator.LT]: 'range',
  [Comparator.LT_OR_EQ]: 'range',
  [Comparator.EQ]: 'term',
  [Comparator.MATCH]: 'match',
  [Comparator.MATCH_PHRASE]: 'match_phrase',
  [Comparator.NOT_EQ]: 'term',
  [Comparator.NOT_MATCH]: 'match',
  [Comparator.NOT_MATCH_PHRASE]: 'match_phrase',
};

const getQueryMappingForComparator = (comparator: Comparator) => {
  return queryMappings[comparator];
};
