/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import { excludeTiersQuery } from '@kbn/observability-utils-common/es/queries/exclude_tiers_query';

export function getDataTierFilterCombined({
  filter,
  excludedDataTiers,
}: {
  filter?: QueryDslQueryContainer;
  excludedDataTiers: DataTier[];
}): QueryDslQueryContainer | undefined {
  if (!filter) {
    return excludedDataTiers.length > 0 ? excludeTiersQuery(excludedDataTiers)[0] : undefined;
  }

  return !excludedDataTiers
    ? filter
    : {
        bool: {
          must: [filter, ...excludeTiersQuery(excludedDataTiers)],
        },
      };
}
