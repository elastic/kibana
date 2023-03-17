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

import { Actions } from '../../../shared/api_logic/create_api_logic';
import {
  FetchFormulaPublicApiLogic,
  FetchFormulaPublicApiParams,
  FetchFormulaPublicApiResponse,
} from '../../api/engines/fetch_formula_api_logic';

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
  formulaData: typeof FetchFormulaPublicApiLogic.values.data; // fetch Formula Public Api
  isNoResultsCardVisible: boolean;
  noResults: number;
  noResultsPercentage: number;
  queriesCount: number;
  queriesCountPercentage: number;
  timeRange: { from: string; to: string };
}

export type EngineAnalyticsActions = Pick<
  Actions<FetchFormulaPublicApiParams, FetchFormulaPublicApiResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  fetchFormula: (lens: LensPublicStart) => {
    lens: LensPublicStart;
  };
  getDefaultDataView: (data: DataPublicPluginStart) => {
    data: DataPublicPluginStart;
  };
  setDefaultDataView: (defaultDataView: DataView | null) => {
    defaultDataView: DataView | null;
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

  setTimeRange: (args: OnTimeChangeProps) => { end: string; start: string };
  setTotalQueries: (totalQueries: number) => {
    totalQueries: number;
  };
  setTotalQueriesPercentage: (totalQueriesPercentage: number) => {
    totalQueriesPercentage: number;
  };
};

export const EngineAnalyticsLogic = kea<
  MakeLogicType<EngineAnalyticsValues, EngineAnalyticsActions>
>({
  actions: {
    fetchFormula: (lens: LensPublicStart | null) => ({ lens }),
    getDefaultDataView: (data: DataPublicPluginStart) => ({ data }),
    setDefaultDataView: (defaultDataView: DataView | null) => ({ defaultDataView }),
    setIsLoading: (value) => ({ value }),
    setNoResults: (noResults) => ({ noResults }),
    setNoResultsCardVisible: false,
    setNoResultsPercentage: (noResultsPercentage) => ({
      noResultsPercentage,
    }),

    setQueriesCardVisible: true, // we show total queries card by default when page loads

    setTimeRange: (args: OnTimeChangeProps) => ({ end: args.end, start: args.start }),
    setTotalQueries: (totalQueries) => ({ totalQueries }),
    setTotalQueriesPercentage: (totalQueriesPercentage) => ({ totalQueriesPercentage }),
  },
  connect: {
    actions: [FetchFormulaPublicApiLogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [FetchFormulaPublicApiLogic, ['data as formulaData']],
  },
  listeners: ({ actions }) => ({
    // TODO:: Should be changed to engine specific data view
    // Load default Data view from Data plugin from Kibana Logic
    getDefaultDataView: async (input) => {
      const defaultDataView = (await input?.data?.dataViews?.getDefault()) ?? null;
      actions.setDefaultDataView(defaultDataView);
    },
    // Load formula from Lens plugin from Kibana Logic
    fetchFormula: async (input) => {
      actions.makeRequest(input);
    },
  }),
  selectors: ({ selectors }) => ({
    formula: [
      () => [selectors.formulaData],
      (data: EngineAnalyticsValues['formulaData']) => data ?? null,
    ],
  }),
  path: ['enterprise_search', 'content', 'engines', 'overview', 'analytics'],
  reducers: ({}) => ({
    defaultDataView: [
      null,
      {
        setDefaultDataView: (_, { defaultDataView }) => defaultDataView,
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
