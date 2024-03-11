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
  DeleteConnectorApiLogic,
  DeleteConnectorApiLogicActions,
} from '../../api/connector/delete_connector_api_logic';
import {
  FetchConnectorsApiLogic,
  FetchConnectorsApiLogicActions,
} from '../../api/connector/fetch_connectors.api';

export type ConnectorViewItem = Connector & { docsCount?: number; indexExists: boolean };
export interface ConnectorsActions {
  apiError: FetchConnectorsApiLogicActions['apiError'];
  apiSuccess: FetchConnectorsApiLogicActions['apiSuccess'];
  closeDeleteModal(): void;
  deleteConnector: DeleteConnectorApiLogicActions['makeRequest'];
  deleteError: DeleteConnectorApiLogicActions['apiError'];
  deleteSuccess: DeleteConnectorApiLogicActions['apiSuccess'];
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
  openDeleteModal(
    connectorName: string,
    connectorId: string,
    indexName: string | null
  ): {
    connectorId: string;
    connectorName: string;
    indexName: string | null;
  };
  setIsFirstRequest(): void;
}
export interface ConnectorsValues {
  connectors: ConnectorViewItem[];
  data: typeof FetchConnectorsApiLogic.values.data;
  deleteModalConnectorId: string;
  deleteModalConnectorName: string;
  deleteModalIndexName: string | null;
  deleteStatus: typeof DeleteConnectorApiLogic.values.status;
  isDeleteLoading: boolean;
  isDeleteModalVisible: boolean;
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
    closeDeleteModal: true,
    fetchConnectors: ({ fetchCrawlersOnly, from, size, searchQuery }) => ({
      fetchCrawlersOnly,
      from,
      searchQuery,
      size,
    }),
    onPaginate: (newPageIndex) => ({ newPageIndex }),
    openDeleteModal: (connectorName, connectorId, indexName) => ({
      connectorId,
      connectorName,
      indexName,
    }),
    setIsFirstRequest: true,
  },
  connect: {
    actions: [
      DeleteConnectorApiLogic,
      ['apiError as deleteError', 'apiSuccess as deleteSuccess', 'makeRequest as deleteConnector'],
      FetchConnectorsApiLogic,
      ['makeRequest', 'apiSuccess', 'apiError'],
    ],
    values: [
      DeleteConnectorApiLogic,
      ['status as deleteStatus'],
      FetchConnectorsApiLogic,
      ['data', 'status'],
    ],
  },
  listeners: ({ actions, values }) => ({
    deleteSuccess: () => {
      actions.closeDeleteModal();
      actions.makeRequest(values.searchParams);
    },
    fetchConnectors: async (input, breakpoint) => {
      await breakpoint(150);
      actions.makeRequest(input);
    },
  }),
  path: ['enterprise_search', 'content', 'connectors_logic'],
  reducers: () => ({
    deleteModalConnectorId: [
      '',
      {
        closeDeleteModal: () => '',
        openDeleteModal: (_, { connectorId }) => connectorId,
      },
    ],
    deleteModalConnectorName: [
      '',
      {
        closeDeleteModal: () => '',
        openDeleteModal: (_, { connectorName }) => connectorName,
      },
    ],
    deleteModalIndexName: [
      null,
      {
        closeDeleteModal: () => null,
        openDeleteModal: (_, { indexName }) => indexName,
      },
    ],
    isDeleteModalVisible: [
      false,
      {
        closeDeleteModal: () => false,
        openDeleteModal: () => true,
      },
    ],
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
                indexExists: data?.indexExists[indexName],
              };
            }
            return connector;
          }) || []
        );
      },
    ],
    isDeleteLoading: [
      () => [selectors.deleteStatus],
      (deleteStatus) => Status.LOADING === deleteStatus,
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
