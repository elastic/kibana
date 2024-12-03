/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { IngestionMethod } from '@kbn/search-connectors';

import { Status } from '../../../../../common/types/api';
import { Meta } from '../../../../../common/types/pagination';
import { Actions } from '../../../shared/api_logic/create_api_logic';
import {
  CancelSyncsActions,
  CancelSyncsApiLogic,
} from '../../api/connector/cancel_syncs_api_logic';
import {
  DeleteIndexApiLogic,
  DeleteIndexApiLogicArgs,
  DeleteIndexApiLogicValues,
} from '../../api/index/delete_index_api_logic';
import {
  FetchIndexActions,
  FetchIndexApiLogic,
  FetchIndexApiResponse,
} from '../../api/index/fetch_index_api_logic';
import {
  FetchIndicesApiActions,
  FetchIndicesAPILogic,
} from '../../api/index/fetch_indices_api_logic';
import { ElasticsearchViewIndex } from '../../types';
import { getIngestionMethod, indexToViewIndex } from '../../utils/indices';

export interface IndicesActions {
  apiError: FetchIndicesApiActions['apiError'];
  apiSuccess: FetchIndicesApiActions['apiSuccess'];
  cancelSuccess: CancelSyncsActions['apiSuccess'];
  closeDeleteModal(): void;
  deleteError: Actions<DeleteIndexApiLogicArgs, DeleteIndexApiLogicValues>['apiError'];
  deleteIndex: Actions<DeleteIndexApiLogicArgs, DeleteIndexApiLogicValues>['makeRequest'];
  deleteSuccess: Actions<DeleteIndexApiLogicArgs, DeleteIndexApiLogicValues>['apiSuccess'];
  fetchIndexDetails: FetchIndexActions['makeRequest'];
  fetchIndices({
    from,
    onlyShowSearchOptimizedIndices,
    returnHiddenIndices,
    searchQuery,
    size,
  }: {
    from: number;
    onlyShowSearchOptimizedIndices: boolean;
    returnHiddenIndices: boolean;
    searchQuery?: string;
    size: number;
  }): {
    from: number;
    meta: Meta;
    onlyShowSearchOptimizedIndices: boolean;
    returnHiddenIndices: boolean;
    searchQuery?: string;
    size: number;
  };
  makeRequest: FetchIndicesApiActions['makeRequest'];
  onPaginate(newPageIndex: number): { newPageIndex: number };
  openDeleteModal(indexName: string): { indexName: string };
  setIsFirstRequest(): void;
}
export interface IndicesValues {
  data: typeof FetchIndicesAPILogic.values.data;
  deleteModalIndex: FetchIndexApiResponse | null;
  deleteModalIndexHasInProgressSyncs: boolean;
  deleteModalIndexName: string;
  deleteModalIngestionMethod: IngestionMethod;
  deleteStatus: typeof DeleteIndexApiLogic.values.status;
  hasNoIndices: boolean;
  indexDetails: FetchIndexApiResponse | null;
  indexDetailsStatus: Status;
  indices: ElasticsearchViewIndex[];
  isDeleteLoading: boolean;
  isDeleteModalVisible: boolean;
  isFetchIndexDetailsLoading: boolean;
  isFirstRequest: boolean;
  isLoading: boolean;
  meta: Meta;
  searchParams: {
    from: number;
    onlyShowSearchOptimizedIndices: boolean;
    returnHiddenIndices: boolean;
    searchQuery?: string;
    size: number;
  };
  status: typeof FetchIndicesAPILogic.values.status;
}

export const IndicesLogic = kea<MakeLogicType<IndicesValues, IndicesActions>>({
  actions: {
    closeDeleteModal: true,
    fetchIndices: ({
      from,
      onlyShowSearchOptimizedIndices,
      returnHiddenIndices,
      searchQuery,
      size,
    }) => ({
      from,
      onlyShowSearchOptimizedIndices,
      returnHiddenIndices,
      searchQuery,
      size,
    }),
    onPaginate: (newPageIndex) => ({ newPageIndex }),
    openDeleteModal: (indexName) => ({ indexName }),
    setIsFirstRequest: true,
  },
  connect: {
    actions: [
      CancelSyncsApiLogic,
      ['apiSuccess as cancelSuccess'],
      FetchIndexApiLogic,
      ['makeRequest as fetchIndexDetails'],
      FetchIndicesAPILogic,
      ['makeRequest', 'apiSuccess', 'apiError'],
      DeleteIndexApiLogic,
      ['apiError as deleteError', 'apiSuccess as deleteSuccess', 'makeRequest as deleteIndex'],
    ],
    values: [
      FetchIndexApiLogic,
      ['data as indexDetails', 'status as indexDetailsStatus'],
      FetchIndicesAPILogic,
      ['data', 'status'],
      DeleteIndexApiLogic,
      ['status as deleteStatus'],
    ],
  },
  listeners: ({ actions, values }) => ({
    cancelSuccess: async () => {
      actions.fetchIndexDetails({ indexName: values.deleteModalIndexName });
    },
    deleteSuccess: () => {
      actions.closeDeleteModal();
      actions.fetchIndices(values.searchParams);
    },
    fetchIndices: async (input, breakpoint) => {
      await breakpoint(150);
      actions.makeRequest(input);
    },
    openDeleteModal: ({ indexName }) => {
      actions.fetchIndexDetails({ indexName });
    },
  }),
  path: ['enterprise_search', 'content', 'indices_logic'],
  // @ts-expect-error upgrade typescript v5.1.6
  reducers: () => ({
    deleteModalIndexName: [
      '',
      {
        closeDeleteModal: () => '',
        // @ts-expect-error upgrade typescript v5.1.6
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
        from: 0,
        onlyShowSearchOptimizedIndices: false,
        returnHiddenIndices: false,
        size: 20,
      },
      {
        apiSuccess: (
          // @ts-expect-error upgrade typescript v5.1.6
          _,
          // @ts-expect-error upgrade typescript v5.1.6
          { meta, onlyShowSearchOptimizedIndices, returnHiddenIndices, searchQuery }
        ) => ({
          from: meta.page.from,
          onlyShowSearchOptimizedIndices,
          returnHiddenIndices,
          searchQuery,
          size: meta.page.size,
        }),
        // @ts-expect-error upgrade typescript v5.1.6
        onPaginate: (state, { newPageIndex }) => ({
          ...state,
          from: (newPageIndex - 1) * state.size,
        }),
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    deleteModalIndex: [
      () => [selectors.deleteModalIndexName, selectors.indexDetails],
      (indexName: string, indexDetails: FetchIndexApiResponse | null) =>
        indexName === indexDetails?.name ? indexDetails : null,
    ],
    deleteModalIndexHasInProgressSyncs: [
      () => [selectors.deleteModalIndex],
      (index: FetchIndexApiResponse | null) => (index ? index.has_in_progress_syncs : false),
    ],
    deleteModalIngestionMethod: [
      () => [selectors.indexDetails],
      (index: FetchIndexApiResponse | null) =>
        index ? getIngestionMethod(index) : IngestionMethod.API,
    ],
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
    isDeleteLoading: [
      () => [selectors.deleteStatus],
      (status: IndicesValues['deleteStatus']) => [Status.LOADING].includes(status),
    ],
    isFetchIndexDetailsLoading: [
      () => [selectors.indexDetailsStatus],
      (status: IndicesValues['indexDetailsStatus']) =>
        [Status.IDLE, Status.LOADING].includes(status),
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
