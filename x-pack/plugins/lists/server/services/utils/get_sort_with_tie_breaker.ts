/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SortFieldOrUndefined, SortOrderOrUndefined } from '../../../common/schemas';

export interface SortWithTieBreakerReturn {
  tie_breaker_id: 'asc';
  [key: string]: string;
}

export const getSortWithTieBreaker = ({
  sortField,
  sortOrder,
}: {
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}): SortWithTieBreakerReturn[] | undefined => {
  const ascOrDesc = sortOrder ?? 'asc';
  if (sortField != null) {
    return [{ [sortField]: ascOrDesc, tie_breaker_id: 'asc' }];
  } else {
    return [{ tie_breaker_id: 'asc' }];
  }
};
