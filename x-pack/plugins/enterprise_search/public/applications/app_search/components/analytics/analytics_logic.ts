/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';
import queryString from 'query-string';

import { KibanaLogic } from '../../../shared/kibana';
import { HttpLogic } from '../../../shared/http';
import { flashAPIErrors } from '../../../shared/flash_messages';
import { EngineLogic } from '../engine';

import { AnalyticsData, QueryDetails } from './types';

interface AnalyticsValues extends AnalyticsData, QueryDetails {
  dataLoading: boolean;
}

interface AnalyticsActions {
  onAnalyticsUnavailable(): void;
  onAnalyticsDataLoad(data: AnalyticsData): AnalyticsData;
  onQueryDataLoad(data: QueryDetails): QueryDetails;
  loadAnalyticsData(): void;
  loadQueryData(query: string): string;
}

export const AnalyticsLogic = kea<MakeLogicType<AnalyticsValues, AnalyticsActions>>({
  path: ['enterprise_search', 'app_search', 'analytics_logic'],
  actions: () => ({
    onAnalyticsUnavailable: true,
    onAnalyticsDataLoad: (data) => data,
    onQueryDataLoad: (data) => data,
    loadAnalyticsData: true,
    loadQueryData: (query) => query,
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        loadAnalyticsData: () => true,
        loadQueryData: () => true,
        onAnalyticsUnavailable: () => false,
        onAnalyticsDataLoad: () => false,
        onQueryDataLoad: () => false,
      },
    ],
    analyticsUnavailable: [
      false,
      {
        onAnalyticsUnavailable: () => true,
        onAnalyticsDataLoad: () => false,
        onQueryDataLoad: () => false,
      },
    ],
  }),
  listeners: ({ actions }) => ({
    loadAnalyticsData: async () => {
      const { history } = KibanaLogic.values;
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const { start, end, tag } = queryString.parse(history.location.search);
        const query = { start, end, tag, size: 20 };
        const url = `/api/app_search/engines/${engineName}/analytics/queries`;

        const response = await http.get(url, { query });

        if (response.analyticsUnavailable) {
          actions.onAnalyticsUnavailable();
        } else {
          actions.onAnalyticsDataLoad(response);
        }
      } catch (e) {
        flashAPIErrors(e);
        actions.onAnalyticsUnavailable();
      }
    },
    loadQueryData: async (query) => {
      const { history } = KibanaLogic.values;
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const { start, end, tag } = queryString.parse(history.location.search);
        const queryParams = { start, end, tag };
        const url = `/api/app_search/engines/${engineName}/analytics/queries/${query}`;

        const response = await http.get(url, { query: queryParams });

        if (response.analyticsUnavailable) {
          actions.onAnalyticsUnavailable();
        } else {
          actions.onQueryDataLoad(response);
        }
      } catch (e) {
        flashAPIErrors(e);
        actions.onAnalyticsUnavailable();
      }
    },
  }),
});
