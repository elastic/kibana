/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kea, MakeLogicType } from 'kea';

import { OnTimeChangeProps } from '@elastic/eui';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { FormulaPublicApi } from '@kbn/lens-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';

const DEFAULT_TIME_RANGE = {
  from: 'now-7d',
  to: 'now',
};
// card and panel titles
export const titles = {
  cardNoResults: 'Total queries with no results',
  cardQueries: 'Total queries',
  panelNoResults: 'Queries - No Results',
  panelQueries: 'Queries - Total',
};
export interface EngineAnalyticsValues {
  defaultDataView: DataView | null;
  formula: FormulaPublicApi | null;
  isNoResultsCardVisible: boolean;
  noResults: number;
  noResultsPercentage: number;
  queriesCount: number;
  queriesCountPercentage: number;
  searchSessionId: string | undefined;
  timeRange: { from: string; to: string };
}

export interface EngineAnalyticsActions {
  getDefaultDataView: (data: DataPublicPluginStart) => {
    data: DataPublicPluginStart;
  };
  getFormula: (lens: LensPublicStart) => {
    lens: LensPublicStart;
  };
  setDefaultDataView: (defaultDataView: DataView | null) => {
    defaultDataView: DataView | null;
  };
  setFormula: (formula: FormulaPublicApi | null) => {
    formula: FormulaPublicApi | null;
  };

  setIsLoading: (value: boolean) => { value: boolean };
  setNoResults: (noResults: number) => {
    noResults: number;
  };
  setNoResultsCardVisible: () => void;
  setNoResultsPercentage: (noResultsPercentage: number) => {
    noResultsPercentage: number;
  };
  setQueriesCardVisible: () => void;

  setSearchSessionId: (sessionId: string) => { sessionId: string };
  setTimeRange: (args: OnTimeChangeProps) => { end: string; start: string };
  setTotalQueries: (totalQueries: number) => {
    totalQueries: number;
  };
  setTotalQueriesPercentage: (totalQueriesPercentage: number) => {
    totalQueriesPercentage: number;
  };
}

export const EngineAnalyticsLogic = kea<
  MakeLogicType<EngineAnalyticsValues, EngineAnalyticsActions>
>({
  actions: {
    getDefaultDataView: (data: DataPublicPluginStart) => ({ data }),
    getFormula: (lens: LensPublicStart | null) => ({ lens }),
    setDefaultDataView: (defaultDataView: DataView | null) => ({ defaultDataView }),
    setFormula: (formula: FormulaPublicApi) => ({ formula }),
    setIsLoading: (value) => ({ value }),
    setNoResults: (noResults) => ({ noResults }),
    setNoResultsCardVisible: false,
    setNoResultsPercentage: (noResultsPercentage) => ({
      noResultsPercentage,
    }),

    setQueriesCardVisible: true, // we show total queries card by default when page loads
    setSearchSessionId: (sessionId: string) => ({ sessionId }),
    setTimeRange: (args: OnTimeChangeProps) => ({ end: args.end, start: args.start }),
    setTotalQueries: (totalQueries) => ({ totalQueries }),
    setTotalQueriesPercentage: (totalQueriesPercentage) => ({ totalQueriesPercentage }),
  },

  listeners: ({ actions }) => ({
    // Load default Data view from Data plugin from Kibana Logic
    getDefaultDataView: async (input) => {
      const defaultDataView = (await input?.data?.dataViews?.getDefault()) ?? null;
      actions.setDefaultDataView(defaultDataView);
    },
    // Load formula from Lens plugin from Kibana Logic
    getFormula: async (input) => {
      const { formula } = (await input?.lens?.stateHelperApi()) ?? null;
      actions.setFormula(formula);
    },
  }),
  path: ['enterprise_search', 'content', 'engines', 'overview', 'analytics'],
  reducers: ({}) => ({
    defaultDataView: [
      null,
      {
        setDefaultDataView: (_, { defaultDataView }) => defaultDataView,
      },
    ],
    formula: [
      null,
      {
        setFormula: (_, { formula }) => formula,
      },
    ],

    isNoResultsCardVisible: [
      false,
      {
        setNoResultsCardVisible: () => true,
        setQueriesCardVisible: () => false,
      },
    ],

    noResults: [
      0,
      {
        setNoResults: (_, { noResults }) => noResults,
      },
    ],
    noResultsPercentage: [
      0,
      {
        setNoResultsPercentage: (_, { noResultsPercentage }) => noResultsPercentage,
      },
    ],

    queriesCount: [
      0,
      {
        setTotalQueries: (_, { totalQueries }) => totalQueries,
      },
    ],
    queriesCountPercentage: [
      0,
      {
        setTotalQueriesPercentage: (_, { totalQueriesPercentage }) => totalQueriesPercentage,
      },
    ],
    searchSessionId: [
      '',
      {
        setSearchSessionId: (_, { sessionId }) => sessionId,
      },
    ],

    timeRange: [
      DEFAULT_TIME_RANGE,
      {
        setTimeRange: (state, { end, start }) => ({
          ...state,
          from: start,
          to: end,
        }),
      },
    ],
  }),
});
