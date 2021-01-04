/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';

const POLLING_DURATION = 5000;

interface EngineOverviewApiData {
  apiLogsUnavailable: boolean;
  documentCount: number;
  startDate: string;
  endDate: string;
  operationsPerDay: number[];
  queriesPerDay: number[];
  totalClicks: number;
  totalQueries: number;
}
interface EngineOverviewValues extends EngineOverviewApiData {
  dataLoading: boolean;
  timeoutId: number | null;
}

interface EngineOverviewActions {
  setPolledData(engineMetrics: EngineOverviewApiData): EngineOverviewApiData;
  setTimeoutId(timeoutId: number): { timeoutId: number };
  pollForOverviewMetrics(): void;
  onPollingSuccess(engineMetrics: EngineOverviewApiData): EngineOverviewApiData;
}

export const EngineOverviewLogic = kea<MakeLogicType<EngineOverviewValues, EngineOverviewActions>>({
  path: ['enterprise_search', 'app_search', 'engine_overview_logic'],
  actions: () => ({
    setPolledData: (engineMetrics) => engineMetrics,
    setTimeoutId: (timeoutId) => ({ timeoutId }),
    pollForOverviewMetrics: true,
    onPollingSuccess: (engineMetrics) => engineMetrics,
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        setPolledData: () => false,
      },
    ],
    apiLogsUnavailable: [
      false,
      {
        setPolledData: (_, { apiLogsUnavailable }) => apiLogsUnavailable,
      },
    ],
    startDate: [
      '',
      {
        setPolledData: (_, { startDate }) => startDate,
      },
    ],
    endDate: [
      '',
      {
        setPolledData: (_, { endDate }) => endDate,
      },
    ],
    queriesPerDay: [
      [],
      {
        setPolledData: (_, { queriesPerDay }) => queriesPerDay,
      },
    ],
    operationsPerDay: [
      [],
      {
        setPolledData: (_, { operationsPerDay }) => operationsPerDay,
      },
    ],
    totalQueries: [
      0,
      {
        setPolledData: (_, { totalQueries }) => totalQueries,
      },
    ],
    totalClicks: [
      0,
      {
        setPolledData: (_, { totalClicks }) => totalClicks,
      },
    ],
    documentCount: [
      0,
      {
        setPolledData: (_, { documentCount }) => documentCount,
      },
    ],
    timeoutId: [
      null,
      {
        setTimeoutId: (_, { timeoutId }) => timeoutId,
      },
    ],
  }),
  listeners: ({ actions }) => ({
    pollForOverviewMetrics: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get(`/api/app_search/engines/${engineName}/overview`);
        actions.onPollingSuccess(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    onPollingSuccess: (engineMetrics) => {
      const timeoutId = window.setTimeout(actions.pollForOverviewMetrics, POLLING_DURATION);
      actions.setTimeoutId(timeoutId);
      actions.setPolledData(engineMetrics);
    },
  }),
  events: ({ values }) => ({
    beforeUnmount() {
      if (values.timeoutId !== null) clearTimeout(values.timeoutId);
    },
  }),
});
