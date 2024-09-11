/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const investigationKeys = {
  all: ['investigation'] as const,
  list: (params: { page: number; perPage: number }) =>
    [...investigationKeys.all, 'list', params] as const,
  fetch: (params: { id: string }) => [...investigationKeys.all, 'fetch', params] as const,
  notes: ['investigation', 'notes'] as const,
  fetchNotes: (params: { investigationId: string }) =>
    [...investigationKeys.notes, 'fetch', params] as const,
  items: ['investigation', 'items'] as const,
  fetchItems: (params: { investigationId: string }) =>
    [...investigationKeys.items, 'fetch', params] as const,
};

export type InvestigationKeys = typeof investigationKeys;
