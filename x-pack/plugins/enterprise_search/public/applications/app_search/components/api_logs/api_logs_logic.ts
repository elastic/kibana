/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { DEFAULT_META } from '../../../shared/constants';
import { flashAPIErrors, flashErrorToast } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { updateMetaPageIndex } from '../../../shared/table_pagination';
import { EngineLogic } from '../engine';

import { POLLING_DURATION, POLLING_ERROR_TITLE, POLLING_ERROR_TEXT } from './constants';
import { ApiLogsData, ApiLog } from './types';
import { getDateString } from './utils';

interface ApiLogsValues {
  dataLoading: boolean;
  apiLogs: ApiLog[];
  meta: ApiLogsData['meta'];
  hasNewData: boolean;
  polledData: ApiLogsData;
  intervalId: number | null;
}

interface ApiLogsActions {
  fetchApiLogs(options?: { isPoll: boolean }): { isPoll: boolean };
  pollForApiLogs(): void;
  onPollStart(intervalId: number): { intervalId: number };
  onPollInterval(data: ApiLogsData): ApiLogsData;
  storePolledData(data: ApiLogsData): ApiLogsData;
  updateView(data: ApiLogsData): ApiLogsData;
  onUserRefresh(): void;
  onPaginate(newPageIndex: number): { newPageIndex: number };
}

export const ApiLogsLogic = kea<MakeLogicType<ApiLogsValues, ApiLogsActions>>({
  path: ['enterprise_search', 'app_search', 'api_logs_logic'],
  actions: () => ({
    fetchApiLogs: ({ isPoll } = { isPoll: false }) => ({ isPoll }),
    pollForApiLogs: true,
    onPollStart: (intervalId) => ({ intervalId }),
    onPollInterval: ({ results, meta }) => ({ results, meta }),
    storePolledData: ({ results, meta }) => ({ results, meta }),
    updateView: ({ results, meta }) => ({ results, meta }),
    onUserRefresh: true,
    onPaginate: (newPageIndex) => ({ newPageIndex }),
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        updateView: () => false,
        onPaginate: () => true,
      },
    ],
    apiLogs: [
      [],
      {
        updateView: (_, { results }) => results,
      },
    ],
    meta: [
      DEFAULT_META,
      {
        updateView: (_, { meta }) => meta,
        onPaginate: (state, { newPageIndex }) => updateMetaPageIndex(state, newPageIndex),
      },
    ],
    hasNewData: [
      false,
      {
        storePolledData: () => true,
        updateView: () => false,
      },
    ],
    polledData: [
      {} as ApiLogsData,
      {
        storePolledData: (_, data) => data,
      },
    ],
    intervalId: [
      null,
      {
        onPollStart: (_, { intervalId }) => intervalId,
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    pollForApiLogs: () => {
      if (values.intervalId) return; // Ensure we only have one poll at a time

      const id = window.setInterval(() => actions.fetchApiLogs({ isPoll: true }), POLLING_DURATION);
      actions.onPollStart(id);
    },
    fetchApiLogs: async ({ isPoll }) => {
      if (isPoll && values.dataLoading) return; // Manual fetches (i.e. user pagination) should override polling

      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get<ApiLogsData>(
          `/internal/app_search/engines/${engineName}/api_logs`,
          {
            query: {
              'page[current]': values.meta.page.current,
              'filters[date][from]': getDateString(-1),
              'filters[date][to]': getDateString(),
              sort_direction: 'desc',
            },
          }
        );

        // Manual fetches (e.g. page load, user pagination) should update the view immediately,
        // while polls are stored in-state until the user manually triggers the 'Refresh' action
        if (isPoll) {
          actions.onPollInterval(response);
        } else {
          actions.updateView(response);
        }
      } catch (e) {
        if (isPoll) {
          // If polling fails, it will typically be due to http connection -
          // we should send a more human-readable message if so
          flashErrorToast(POLLING_ERROR_TITLE, {
            text: POLLING_ERROR_TEXT,
            toastLifeTimeMs: POLLING_DURATION * 0.75,
          });
        } else {
          flashAPIErrors(e);
        }
      }
    },
    onPollInterval: (data, breakpoint) => {
      breakpoint(); // Prevents errors if logic unmounts while fetching

      const previousResults = values.meta.page.total_results;
      const newResults = data.meta.page.total_results;
      const isEmpty = previousResults === 0;
      const hasNewData = previousResults !== newResults;

      if (isEmpty && hasNewData) {
        actions.updateView(data); // Empty logs should automatically update with new data without a manual action
      } else if (hasNewData) {
        actions.storePolledData(data); // Otherwise, store any new data until the user manually refreshes the table
      }
    },
    onUserRefresh: () => {
      actions.updateView(values.polledData);
    },
  }),
  events: ({ values }) => ({
    beforeUnmount() {
      if (values.intervalId !== null) clearInterval(values.intervalId);
    },
  }),
});
