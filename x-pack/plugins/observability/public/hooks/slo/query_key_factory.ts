/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Indicator } from '@kbn/slo-schema';

interface SloListFilter {
  name: string;
  page: number;
  sortBy: string;
  indicatorTypes: string[];
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
  activeAlert: (sloIds: string[]) => [...sloKeys.activeAlerts(), sloIds] as const,
  historicalSummaries: () => [...sloKeys.all, 'historicalSummary'] as const,
  historicalSummary: (sloIds: string[]) => [...sloKeys.historicalSummaries(), sloIds] as const,
  globalDiagnosis: () => [...sloKeys.all, 'globalDiagnosis'] as const,
  burnRates: (sloId: string) => [...sloKeys.all, 'burnRates', sloId] as const,
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
