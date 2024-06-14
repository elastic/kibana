/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import queryString from 'query-string';

import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { EngineLogic } from '../engine';

import { DEFAULT_START_DATE, DEFAULT_END_DATE } from './constants';
import { AnalyticsData, QueryDetails } from './types';

interface AnalyticsValues extends AnalyticsData, QueryDetails {
  dataLoading: boolean;
}

interface AnalyticsActions {
  onAnalyticsDataLoad(data: AnalyticsData): AnalyticsData;
  onQueryDataLoad(data: QueryDetails): QueryDetails;
  loadAnalyticsData(): void;
  loadQueryData(query: string): string;
}

export const AnalyticsLogic = kea<MakeLogicType<AnalyticsValues, AnalyticsActions>>({
  path: ['enterprise_search', 'app_search', 'analytics_logic'],
  actions: () => ({
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
        onAnalyticsDataLoad: () => false,
        onQueryDataLoad: () => false,
      },
    ],
    allTags: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onAnalyticsDataLoad: (_, { allTags }) => allTags,
        // @ts-expect-error upgrade typescript v5.1.6
        onQueryDataLoad: (_, { allTags }) => allTags,
      },
    ],
    recentQueries: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onAnalyticsDataLoad: (_, { recentQueries }) => recentQueries,
      },
    ],
    topQueries: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onAnalyticsDataLoad: (_, { topQueries }) => topQueries,
      },
    ],
    topQueriesNoResults: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onAnalyticsDataLoad: (_, { topQueriesNoResults }) => topQueriesNoResults,
      },
    ],
    topQueriesNoClicks: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onAnalyticsDataLoad: (_, { topQueriesNoClicks }) => topQueriesNoClicks,
      },
    ],
    topQueriesWithClicks: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onAnalyticsDataLoad: (_, { topQueriesWithClicks }) => topQueriesWithClicks,
      },
    ],
    totalQueries: [
      0,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onAnalyticsDataLoad: (_, { totalQueries }) => totalQueries,
      },
    ],
    totalQueriesNoResults: [
      0,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onAnalyticsDataLoad: (_, { totalQueriesNoResults }) => totalQueriesNoResults,
      },
    ],
    totalClicks: [
      0,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onAnalyticsDataLoad: (_, { totalClicks }) => totalClicks,
      },
    ],
    queriesPerDay: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onAnalyticsDataLoad: (_, { queriesPerDay }) => queriesPerDay,
      },
    ],
    queriesNoResultsPerDay: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onAnalyticsDataLoad: (_, { queriesNoResultsPerDay }) => queriesNoResultsPerDay,
      },
    ],
    clicksPerDay: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onAnalyticsDataLoad: (_, { clicksPerDay }) => clicksPerDay,
      },
    ],
    totalQueriesForQuery: [
      0,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onQueryDataLoad: (_, { totalQueriesForQuery }) => totalQueriesForQuery,
      },
    ],
    queriesPerDayForQuery: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onQueryDataLoad: (_, { queriesPerDayForQuery }) => queriesPerDayForQuery,
      },
    ],
    topClicksForQuery: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onQueryDataLoad: (_, { topClicksForQuery }) => topClicksForQuery,
      },
    ],
    startDate: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onAnalyticsDataLoad: (_, { startDate }) => startDate,
        // @ts-expect-error upgrade typescript v5.1.6
        onQueryDataLoad: (_, { startDate }) => startDate,
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
        const query = {
          start: start || DEFAULT_START_DATE,
          end: end || DEFAULT_END_DATE,
          tag,
          size: 20,
        };
        const url = `/internal/app_search/engines/${engineName}/analytics/queries`;

        const response = await http.get<AnalyticsData>(url, { query });
        actions.onAnalyticsDataLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    loadQueryData: async (query) => {
      const { history } = KibanaLogic.values;
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const { start, end, tag } = queryString.parse(history.location.search);
        const queryParams = {
          start: start || DEFAULT_START_DATE,
          end: end || DEFAULT_END_DATE,
          tag,
        };
        const url = `/internal/app_search/engines/${engineName}/analytics/queries/${query}`;

        const response = await http.get<QueryDetails>(url, { query: queryParams });

        actions.onQueryDataLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
