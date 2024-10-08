/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

'investigations,list,{page:1,perPage:25}';

export const investigationKeys = {
  all: ['investigations'] as const,
  userProfiles: (profileIds: Set<string>) =>
    [...investigationKeys.all, 'userProfiles', ...profileIds] as const,
  tags: () => [...investigationKeys.all, 'tags'] as const,
  events: (rangeFrom?: string, rangeTo?: string) =>
    [...investigationKeys.all, 'events', rangeFrom, rangeTo] as const,
  stats: () => [...investigationKeys.all, 'stats'] as const,
  lists: () => [...investigationKeys.all, 'list'] as const,
  list: (params: { page: number; perPage: number; search?: string; filter?: string }) =>
    [...investigationKeys.lists(), params] as const,
  details: () => [...investigationKeys.all, 'detail'] as const,
  detail: (investigationId: string) => [...investigationKeys.details(), investigationId] as const,
  detailNotes: (investigationId: string) =>
    [...investigationKeys.detail(investigationId), 'notes'] as const,
  detailItems: (investigationId: string) =>
    [...investigationKeys.detail(investigationId), 'items'] as const,
  entities: ({
    investigationId,
    ...params
  }: {
    investigationId: string;
    serviceName?: string;
    serviceEnvironment?: string;
    hostName?: string;
    containerId?: string;
  }) => [...investigationKeys.detail(investigationId), 'entities', params] as const,
};

export type InvestigationKeys = typeof investigationKeys;
