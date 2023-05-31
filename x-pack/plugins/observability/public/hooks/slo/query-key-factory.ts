/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const sloKeys = {
  all: ['slo'] as const,
  lists: () => [...sloKeys.all, 'list'] as const,
  list: (filters: { name: string; page: number; sortBy: string; indicatorTypes: string[] }) =>
    [...sloKeys.lists(), filters] as const,
  details: () => [...sloKeys.all, 'details'] as const,
  detail: (sloId?: string) => [...sloKeys.details(), sloId] as const,
  rules: () => [...sloKeys.all, 'rules'] as const,
  rule: (sloId: string) => [...sloKeys.rules(), sloId] as const,
  activeAlerts: () => [...sloKeys.all, 'activeAlerts'] as const,
  activeAlert: (sloIds: string[]) => [...sloKeys.activeAlerts(), sloIds] as const,
  historicalSummaries: () => [...sloKeys.all, 'historicalSummary'] as const,
  historicalSummary: (sloIds: string[]) => [...sloKeys.historicalSummaries(), sloIds] as const,
  globalDiagnosis: () => [...sloKeys.all, 'globalDiagnosis'] as const,
};
