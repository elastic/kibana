/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';

interface EngineOverviewApiData {
  documentCount: number;
  startDate: string;
  operationsPerDay: number[];
  queriesPerDay: number[];
  totalClicks: number;
  totalQueries: number;
}
interface EngineOverviewValues extends EngineOverviewApiData {
  dataLoading: boolean;
}

interface EngineOverviewActions {
  loadOverviewMetrics(): void;
  onOverviewMetricsLoad(response: EngineOverviewApiData): EngineOverviewApiData;
}

export const EngineOverviewLogic = kea<MakeLogicType<EngineOverviewValues, EngineOverviewActions>>({
  path: ['enterprise_search', 'app_search', 'engine_overview_logic'],
  actions: () => ({
    loadOverviewMetrics: true,
    onOverviewMetricsLoad: (engineMetrics) => engineMetrics,
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        onOverviewMetricsLoad: () => false,
      },
    ],
    startDate: [
      '',
      {
        onOverviewMetricsLoad: (_, { startDate }) => startDate,
      },
    ],
    queriesPerDay: [
      [],
      {
        onOverviewMetricsLoad: (_, { queriesPerDay }) => queriesPerDay,
      },
    ],
    operationsPerDay: [
      [],
      {
        onOverviewMetricsLoad: (_, { operationsPerDay }) => operationsPerDay,
      },
    ],
    totalQueries: [
      0,
      {
        onOverviewMetricsLoad: (_, { totalQueries }) => totalQueries,
      },
    ],
    totalClicks: [
      0,
      {
        onOverviewMetricsLoad: (_, { totalClicks }) => totalClicks,
      },
    ],
    documentCount: [
      0,
      {
        onOverviewMetricsLoad: (_, { documentCount }) => documentCount,
      },
    ],
  }),
  listeners: ({ actions }) => ({
    loadOverviewMetrics: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get<EngineOverviewApiData>(
          `/internal/app_search/engines/${engineName}/overview`
        );
        actions.onOverviewMetricsLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
