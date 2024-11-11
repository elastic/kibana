/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsQuerySortValue } from '@kbn/data-plugin/common';
import { SortDirection } from '@kbn/data-plugin/common';

export function removeSOAttributes(kuery: string) {
  return kuery.replace(/attributes\./g, '').replace(/fleet-agents\./g, '');
}

export function getSortConfig(sortField: string, sortOrder: SortDirection): EsQuerySortValue[] {
  const isDefaultSort = sortField === 'enrolled_at' && sortOrder === SortDirection.desc;
  // if using default sorting (enrolled_at), adding a secondary sort on hostname, so that the results are not changing randomly in case many agents were enrolled at the same time
  const secondarySort: EsQuerySortValue[] = isDefaultSort
    ? [{ 'local_metadata.host.hostname.keyword': { order: SortDirection.asc } }]
    : [];
  return [{ [sortField]: { order: sortOrder } }, ...secondarySort];
}
