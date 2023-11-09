/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types/pagination';
import {
  FetchConnectorsApiLogic,
  FetchConnectorsApiLogicActions,
} from '../../api/connector/fetch_connectors.api';
import { ElasticsearchViewIndex } from '../../types';
import { indexToViewIndex } from '../../utils/indices';

export interface ConnectorsActions {
  apiSuccess: FetchConnectorsApiLogicActions['apiSuccess'];
  closeDeleteModal(): void;
  fetchConnectors({
    connectorType,
    from,
    size,
  }: {
    connectorType: 'connector' | 'crawler';
    from: number;
    size: number;
  }): {
    connectorType: 'connector' | 'crawler';
    from: number;
    size: number;
  };
  makeRequest: FetchConnectorsApiLogicActions['makeRequest'];
  onPaginate(newPageIndex: number): { newPageIndex: number };
  openDeleteModal(indexName: string): { indexName: string };
  setIsFirstRequest(): void;
}
export interface ConnectorsValues {
  data: typeof FetchConnectorsApiLogic.values.data;
  hasNoIndices: boolean;
  indices: ElasticsearchViewIndex[];
  isDeleteLoading: boolean;
  isDeleteModalVisible: boolean;
  isFetchConnectorsDetailsLoading: boolean;
  isFirstRequest: boolean;
  isLoading: boolean;
  meta: Meta;
  searchParams: {
    connectorType: 'connector' | 'crawler';
    from: number;
    size: number;
  };
  status: typeof FetchConnectorsApiLogic.values.status;
}

export const ConnectorsLogic = kea<MakeLogicType<ConnectorsValues, ConnectorsActions>>({
  actions: {
    closeDeleteModal: true,
    fetchConnectors: ({ connectorType, from, size }) => ({
      connectorType,
      from,
      size,
    }),
    onPaginate: (newPageIndex) => ({ newPageIndex }),
    openDeleteModal: (indexName) => ({ indexName }),
    setIsFirstRequest: true,
  },
  connect: {
    actions: [FetchConnectorsApiLogic, ['makeRequest', 'apiSuccess']],
    values: [FetchConnectorsApiLogic, ['data', 'status']],
  },
  listeners: ({ actions }) => ({
    fetchConnectors: async (input, breakpoint) => {
      await breakpoint(150);
      actions.makeRequest(input);
    },
  }),
  path: ['enterprise_search', 'content', 'indices_logic'],
  reducers: () => ({
    searchParams: [
      {
        connectorType: 'connector',
        from: 0,
        size: 10,
      },
      {
        apiSuccess: ({ connectorType }, { meta }) => ({
          connectorType,
          from: meta.page.from,
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
    hasNoIndices: [
      // We need this to show the landing page on the overview page if there are no indices
      // We can't rely just on there being no indices, because user might have entered a search query
      () => [selectors.data],
      (data) => (data?.isInitialRequest && data?.indices && data.indices.length === 0) ?? false,
    ],
    indices: [
      () => [selectors.data],
      (data) => (data?.indices ? data.indices.map(indexToViewIndex) : []),
    ],
    meta: [
      () => [selectors.data],
      (data) => data?.meta ?? { page: { from: 0, size: 20, total: 0 } },
    ],
  }),
});
