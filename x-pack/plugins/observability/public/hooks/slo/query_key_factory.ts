/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Indicator } from '@kbn/slo-schema';

interface SloListFilter {
  kqlQuery: string;
  page: number;
  sortBy: string;
  sortDirection: string;
}

interface CompositeSloKeyFilter {
  name: string;
  page: number;
  sortBy: string;
}

export const sloKeys = {
  all: ['slo'] as const,
  lists: () => [...sloKeys.all, 'list'] as const,
  list: (filters: SloListFilter) => [...sloKeys.lists(), filters] as const,
  details: () => [...sloKeys.all, 'details'] as const,
  detail: (sloId?: string) => [...sloKeys.details(), sloId] as const,
  rules: () => [...sloKeys.all, 'rules'] as const,
  rule: (sloIds: string[]) => [...sloKeys.rules(), sloIds] as const,
  activeAlerts: () => [...sloKeys.all, 'activeAlerts'] as const,
  activeAlert: (sloIdsAndInstanceIds: Array<[string, string]>) =>
    [...sloKeys.activeAlerts(), ...sloIdsAndInstanceIds.flat()] as const,
  historicalSummaries: () => [...sloKeys.all, 'historicalSummary'] as const,
  historicalSummary: (list: Array<{ sloId: string; instanceId: string }>) =>
    [...sloKeys.historicalSummaries(), list] as const,
  definitions: (search: string) => [...sloKeys.all, 'definitions', search] as const,
  globalDiagnosis: () => [...sloKeys.all, 'globalDiagnosis'] as const,
  burnRates: (sloId: string, instanceId: string | undefined) =>
    [...sloKeys.all, 'burnRates', sloId, instanceId] as const,
  preview: (indicator?: Indicator) => [...sloKeys.all, 'preview', indicator] as const,
};

export const compositeSloKeys = {
  all: ['compositeSlo'] as const,
  lists: () => [...compositeSloKeys.all, 'list'] as const,
  list: (filters: CompositeSloKeyFilter) => [...compositeSloKeys.lists(), filters] as const,
  details: () => [...compositeSloKeys.all, 'details'] as const,
  detail: (sloId?: string) => [...compositeSloKeys.details(), sloId] as const,
  rules: () => [...compositeSloKeys.all, 'rules'] as const,
  rule: (sloIds: string[]) => [...compositeSloKeys.rules(), sloIds] as const,
  activeAlerts: () => [...compositeSloKeys.all, 'activeAlerts'] as const,
  activeAlert: (sloIds: string[]) => [...compositeSloKeys.activeAlerts(), sloIds] as const,
  historicalSummaries: () => [...compositeSloKeys.all, 'historicalSummary'] as const,
  historicalSummary: (sloIds: string[]) =>
    [...compositeSloKeys.historicalSummaries(), sloIds] as const,
  globalDiagnosis: () => [...compositeSloKeys.all, 'globalDiagnosis'] as const,
};

export type SloKeys = typeof compositeSloKeys | typeof sloKeys;
