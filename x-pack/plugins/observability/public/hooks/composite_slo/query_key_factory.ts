/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const compositeSloKeys = {
  all: ['compositeSlo'] as const,
  lists: () => [...compositeSloKeys.all, 'list'] as const,
  list: (filters: { sortBy: string; page: number; name: string }) =>
    [...compositeSloKeys.lists(), filters] as const,
};
