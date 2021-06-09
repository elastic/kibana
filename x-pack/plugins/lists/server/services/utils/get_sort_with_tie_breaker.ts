/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import { SortFieldOrUndefined, SortOrderOrUndefined } from '@kbn/securitysolution-io-ts-list-types';

export const getSortWithTieBreaker = ({
  sortField,
  sortOrder,
}: {
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}): estypes.SearchSortCombinations[] => {
  const ascOrDesc = sortOrder ?? ('asc' as const);
  if (sortField != null) {
    return [{ [sortField]: ascOrDesc, tie_breaker_id: 'asc' as const }];
  } else {
    return [{ tie_breaker_id: 'asc' as const }];
  }
};
