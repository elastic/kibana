/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface CompositeSloKeyFilter {
  name: string;
  page: number;
  sortBy: string;
}

export const compositeSloKeys = {
  all: ['compositeSlo'] as const,
  lists: () => [...compositeSloKeys.all, 'compositeSloList'] as const,
  list: (filters: CompositeSloKeyFilter) => [...compositeSloKeys.lists(), filters] as const,
  details: () => [...compositeSloKeys.all, 'compositeSloDetails'] as const,
  detail: (sloId?: string) => [...compositeSloKeys.details(), sloId] as const,
  rules: () => [...compositeSloKeys.all, 'compositeSloRules'] as const,
  rule: (sloIds: string[]) => [...compositeSloKeys.rules(), sloIds] as const,
  activeAlerts: () => [...compositeSloKeys.all, 'compositeSloActiveAlerts'] as const,
  activeAlert: (sloIds: string[]) => [...compositeSloKeys.activeAlerts(), sloIds] as const,
  historicalSummaries: () => [...compositeSloKeys.all, 'compositeSloHistoricalSummary'] as const,
  historicalSummary: (sloIds: string[]) =>
    [...compositeSloKeys.historicalSummaries(), sloIds] as const,
  globalDiagnosis: () => [...compositeSloKeys.all, 'compositeSloGlobalDiagnosis'] as const,
};
