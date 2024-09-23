/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const entityManagerKeys = {
  all: ['entity_manager'],
  definitions: () => [...entityManagerKeys.all, 'definitions'],
  enablement: () => [...entityManagerKeys.all, 'enablement'],
  definition: (id: string) => [...entityManagerKeys.all, 'definition', id],
  entities: (
    query: string,
    sortField: string,
    sortDirection: string,
    searchAfter?: string,
    perPage?: number
  ) => [
    ...entityManagerKeys.all,
    'entities',
    query,
    sortField,
    sortDirection,
    searchAfter || '',
    perPage || 10,
  ],
  transformMessages: (id: string, sortField = 'timestamp', sortDirection = 'desc') => [
    ...entityManagerKeys.all,
    'transformMessages',
    id,
    sortField,
    sortDirection,
  ],
};
