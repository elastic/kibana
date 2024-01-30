/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Connector } from '@kbn/search-connectors/types';

import { Status } from '../../../../../common/types/api';

import { Meta } from '../../../../../common/types/pagination';
import {
  FetchConnectorsApiLogic,
  FetchConnectorsApiLogicActions,
} from '../../api/connector/fetch_connectors.api';

export type ConnectorViewItem = Connector & { docsCount?: number };
export interface ConnectorsActions {
  apiError: FetchConnectorsApiLogicActions['apiError'];
  apiSuccess: FetchConnectorsApiLogicActions['apiSuccess'];
  fetchConnectors({
    fetchCrawlersOnly,
    from,
    size,
    searchQuery,
  }: {
    fetchCrawlersOnly: boolean;
    from: number;
    searchQuery?: string;
    size: number;
  }): {
    fetchCrawlersOnly: boolean;
    from: number;
    searchQuery?: string;
    size: number;
  };
  makeRequest: FetchConnectorsApiLogicActions['makeRequest'];
  onPaginate(newPageIndex: number): { newPageIndex: number };
  setIsFirstRequest(): void;
}
export interface ConnectorsValues {
  connectors: ConnectorViewItem[];
  data: typeof FetchConnectorsApiLogic.values.data;
  isEmpty: boolean;
  isFetchConnectorsDetailsLoading: boolean;
  isFirstRequest: boolean;
  isLoading: boolean;
  meta: Meta;
  searchParams: {
    fetchCrawlersOnly: boolean;
    from: number;
    searchQuery?: string;
    size: number;
  };
  status: typeof FetchConnectorsApiLogic.values.status;
}

export const ConnectorsLogic = kea<MakeLogicType<ConnectorsValues, ConnectorsActions>>({
  actions: {
    fetchConnectors: ({ fetchCrawlersOnly, from, size, searchQuery }) => ({
      fetchCrawlersOnly,
      from,
      searchQuery,
      size,
    }),
    onPaginate: (newPageIndex) => ({ newPageIndex }),
    setIsFirstRequest: true,
  },
  connect: {
    actions: [FetchConnectorsApiLogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [FetchConnectorsApiLogic, ['data', 'status']],
  },
  listeners: ({ actions }) => ({
    fetchConnectors: async (input, breakpoint) => {
      await breakpoint(150);
      actions.makeRequest(input);
    },
  }),
  path: ['enterprise_search', 'content', 'connectors_logic'],
  reducers: () => ({
    isFirstRequest: [
      true,
      {
        apiError: () => false,
        apiSuccess: () => false,
        setIsFirstRequest: () => true,
      },
    ],
    searchParams: [
      {
        fetchCrawlersOnly: false,
        from: 0,
        searchQuery: '',
        size: 10,
      },
      {
        apiSuccess: ({ fetchCrawlersOnly, searchQuery }, { meta }) => ({
          fetchCrawlersOnly,
          from: meta.page.from,
          searchQuery,
          size: meta.page.size,
        }),
        onPaginate: (state, { newPageIndex }) => ({
          ...state,
          from: (newPageIndex - 1) * state.size,
        }),
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    connectors: [
      () => [selectors.data],
      (data: ConnectorsValues['data']) => {
        return (
          data?.connectors.map((connector) => {
            const indexName = connector.index_name;
            if (indexName) {
              return {
                ...connector,
                docsCount: data?.counts[indexName],
              };
            }
            return connector;
          }) || []
        );
      },
    ],
    isEmpty: [
      () => [selectors.data],
      (data) =>
        (data?.isInitialRequest && data?.connectors && data.connectors.length === 0) ?? false,
    ],
    isLoading: [
      () => [selectors.status, selectors.isFirstRequest],
      (status, isFirstRequest) => [Status.LOADING, Status.IDLE].includes(status) && isFirstRequest,
    ],
    meta: [
      () => [selectors.data],
      (data) => data?.meta ?? { page: { from: 0, size: 20, total: 0 } },
    ],
  }),
});
