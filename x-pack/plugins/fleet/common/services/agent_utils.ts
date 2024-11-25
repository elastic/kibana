/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function removeSOAttributes(kuery: string): string {
  return kuery.replace(/attributes\./g, '').replace(/fleet-agents\./g, '');
}

export function getSortConfig(
  sortField: string,
  sortOrder: 'asc' | 'desc'
): Array<Record<string, { order: 'asc' | 'desc' }>> {
  const isDefaultSort = sortField === 'enrolled_at' && sortOrder === 'desc';
  // if using default sorting (enrolled_at), adding a secondary sort on hostname, so that the results are not changing randomly in case many agents were enrolled at the same time
  const secondarySort: Array<Record<string, { order: 'asc' | 'desc' }>> = isDefaultSort
    ? [{ 'local_metadata.host.hostname.keyword': { order: 'asc' } }]
    : [];
  return [{ [sortField]: { order: sortOrder } }, ...secondarySort];
}
