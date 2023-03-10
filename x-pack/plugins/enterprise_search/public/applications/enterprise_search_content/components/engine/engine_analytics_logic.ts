/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kea, MakeLogicType } from 'kea';

import { OnTimeChangeProps } from '@elastic/eui';

const DEFAULT_TIME = {
  from: 'now-70d',
  to: 'now',
};

export interface EngineAnalyticsValues {
  endDate: string;
  isDateLoading: boolean;
  isFirstRequest: boolean;
  isNoResultsCardVisible: boolean;
  noResults: number;
  noResultsPercentage: number;
  queriesCount: number;
  queriesCountPercentage: number;
  searchSessionId: string | undefined;
  startDate: string;
  time: { from: string; to: string };
}

export interface EngineAnalyticsActions {
  setEndDate: (endDate: string) => { endDate: string };
  setIsDateLoading: () => void;
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
  setStartDate: (startDate: string) => { startDate: string };
  setTimeChange: (args: OnTimeChangeProps) => { end: string; start: string };
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
    setEndDate: (endDate) => ({ endDate }),
    setIsLoading: (value) => ({ value }),
    setNoResults: (noResults) => ({ noResults }),
    setNoResultsCardVisible: false,
    setNoResultsPercentage: (noResultsPercentage) => ({
      noResultsPercentage,
    }),
    setQueriesCardVisible: true,
    setSearchSessionId: (sessionId: string) => ({ sessionId }),
    setStartDate: (startDate) => ({ startDate }),
    setTime: (start: string, end: string) => ({ from: start, to: end }),
    setTimeChange: (args: OnTimeChangeProps) => ({ end: args.end, start: args.start }),
    setTotalQueries: (totalQueries) => ({ totalQueries }),
    setTotalQueriesPercentage: (totalQueriesPercentage) => ({ totalQueriesPercentage }),
  },

  path: ['enterprise_search', 'content', 'engines', 'overview', 'analytics'],
  reducers: ({}) => ({
    endDate: [
      DEFAULT_TIME.to,
      {
        setEndDate: (_, { endDate }) => endDate,
      },
    ],
    isDateLoading: [
      false,
      {
        setTimeChange: () => true,
      },
    ],
    isFirstRequest: [
      true,
      {
        setIsFirstRequest: () => true,
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
    startDate: [
      DEFAULT_TIME.from,
      {
        setStartDate: (_, { startDate }) => startDate,
      },
    ],
    time: [
      DEFAULT_TIME,
      {
        setTimeChange: (state, { end, start }) => ({
          ...state,
          from: start,
          to: end,
        }),
      },
    ],
  }),
});
