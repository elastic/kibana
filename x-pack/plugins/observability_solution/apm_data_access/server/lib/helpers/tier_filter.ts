/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IndexLifeCycleDataTier } from '@kbn/observability-shared-plugin/common';

export function getExcludedDataTiersFilter(
  excludedDataTiers: IndexLifeCycleDataTier
): QueryDslQueryContainer {
  return {
    bool: {
      must_not: [
        {
          terms: {
            _tier: excludedDataTiers,
          },
        },
      ],
    },
  };
}

export function getIndexFilter({
  indexFilter,
  excludedDataTiers,
}: {
  indexFilter?: QueryDslQueryContainer;
  excludedDataTiers?: IndexLifeCycleDataTier;
}): QueryDslQueryContainer | undefined {
  if (!indexFilter) {
    return excludedDataTiers ? getExcludedDataTiersFilter(excludedDataTiers) : undefined;
  }

  return !excludedDataTiers
    ? indexFilter
    : {
        bool: {
          must: [indexFilter, getExcludedDataTiersFilter(excludedDataTiers)],
        },
      };
}
