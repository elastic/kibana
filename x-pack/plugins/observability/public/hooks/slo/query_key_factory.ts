/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface SloKeyFilter {
  name: string;
  page: number;
  sortBy: string;
  indicatorTypes: string[];
}

export const sloKeys = {
  all: ['slo'] as const,
  lists: () => [...sloKeys.all, 'sloList'] as const,
  list: (filters: SloKeyFilter) => [...sloKeys.lists(), filters] as const,
  details: () => [...sloKeys.all, 'sloDetails'] as const,
  detail: (sloId?: string) => [...sloKeys.details(), sloId] as const,
  rules: () => [...sloKeys.all, 'sloRules'] as const,
  rule: (sloIds: string[]) => [...sloKeys.rules(), sloIds] as const,
  activeAlerts: () => [...sloKeys.all, 'sloActiveAlerts'] as const,
  activeAlert: (sloIds: string[]) => [...sloKeys.activeAlerts(), sloIds] as const,
  historicalSummaries: () => [...sloKeys.all, 'sloHistoricalSummary'] as const,
  historicalSummary: (sloIds: string[]) => [...sloKeys.historicalSummaries(), sloIds] as const,
  globalDiagnosis: () => [...sloKeys.all, 'sloGlobalDiagnosis'] as const,
};
