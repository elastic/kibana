/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { Meta } from '../../../../../common/types';
import { HttpError, Status } from '../../../../../common/types/api';
import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';
import { Actions } from '../../../shared/api_logic/create_api_logic';
import { DEFAULT_META } from '../../../shared/constants';
import {
  flashAPIErrors,
  clearFlashMessages,
  flashSuccessToast,
} from '../../../shared/flash_messages';
import { updateMetaPageIndex } from '../../../shared/table_pagination';
import {
  DeleteIndexApiLogic,
  DeleteIndexApiLogicArgs,
} from '../../api/index/delete_index_api_logic';
import { FetchIndicesAPILogic } from '../../api/index/fetch_indices_api_logic';
import { ElasticsearchViewIndex, IngestionMethod } from '../../types';
import { getIngestionMethod, indexToViewIndex } from '../../utils/indices';

export interface IndicesActions {
  apiError(error: HttpError): HttpError;
  apiSuccess({
    indices,
    isInitialRequest,
    meta,
    returnHiddenIndices,
    searchQuery,
  }: {
    indices: ElasticsearchIndexWithIngestion[];
    isInitialRequest: boolean;
    meta: Meta;
    returnHiddenIndices: boolean;
    searchQuery?: string;
  }): {
    indices: ElasticsearchIndexWithIngestion[];
    isInitialRequest: boolean;
    meta: Meta;
    returnHiddenIndices: boolean;
    searchQuery?: string;
  };
  closeDeleteModal(): void;
  deleteError: Actions<DeleteIndexApiLogicArgs, void>['apiError'];
  deleteIndex: Actions<DeleteIndexApiLogicArgs, void>['makeRequest'];
  deleteSuccess: Actions<DeleteIndexApiLogicArgs, void>['apiSuccess'];
  fetchIndices({
    meta,
    returnHiddenIndices,
    searchQuery,
  }: {
    meta: Meta;
    returnHiddenIndices: boolean;
    searchQuery?: string;
  }): { meta: Meta; returnHiddenIndices: boolean; searchQuery?: string };
  makeRequest: typeof FetchIndicesAPILogic.actions.makeRequest;
  onPaginate(newPageIndex: number): { newPageIndex: number };
  openDeleteModal(index: ElasticsearchViewIndex): { index: ElasticsearchViewIndex };
  setIsFirstRequest(): void;
}
export interface IndicesValues {
  data: typeof FetchIndicesAPILogic.values.data;
  deleteModalIndex: ElasticsearchViewIndex | null;
  deleteModalIndexName: string;
  deleteModalIngestionMethod: IngestionMethod;
  deleteStatus: typeof DeleteIndexApiLogic.values.status;
  hasNoIndices: boolean;
  indices: ElasticsearchViewIndex[];
  isDeleteLoading: boolean;
  isDeleteModalVisible: boolean;
  isFirstRequest: boolean;
  isLoading: boolean;
  meta: Meta;
  searchParams: { meta: Meta; returnHiddenIndices: boolean; searchQuery?: string };
  status: typeof FetchIndicesAPILogic.values.status;
}

export const IndicesLogic = kea<MakeLogicType<IndicesValues, IndicesActions>>({
  actions: {
    closeDeleteModal: true,
    fetchIndices: ({ meta, returnHiddenIndices, searchQuery }) => ({
      meta,
      returnHiddenIndices,
      searchQuery,
    }),
    onPaginate: (newPageIndex) => ({ newPageIndex }),
    openDeleteModal: (index) => ({ index }),
    setIsFirstRequest: true,
  },
  connect: {
    actions: [
      FetchIndicesAPILogic,
      ['makeRequest', 'apiSuccess', 'apiError'],
      DeleteIndexApiLogic,
      ['apiError as deleteError', 'apiSuccess as deleteSuccess', 'makeRequest as deleteIndex'],
    ],
    values: [
      FetchIndicesAPILogic,
      ['data', 'status'],
      DeleteIndexApiLogic,
      ['status as deleteStatus'],
    ],
  },
  listeners: ({ actions, values }) => ({
    apiError: (e) => flashAPIErrors(e),
    deleteError: (e) => flashAPIErrors(e),
    deleteSuccess: () => {
      flashSuccessToast(
        i18n.translate('xpack.enterpriseSearch.content.indices.deleteIndex.successToast.title', {
          defaultMessage:
            'Your index {indexName} and any associated ingestion configurations were successfully deleted',
          values: {
            indexName: values.deleteModalIndexName,
          },
        })
      );
      actions.closeDeleteModal();
      actions.fetchIndices(values.searchParams);
    },
    fetchIndices: async (input, breakpoint) => {
      await breakpoint(150);
      actions.makeRequest(input);
    },
    makeRequest: () => clearFlashMessages(),
  }),
  path: ['enterprise_search', 'content', 'indices_logic'],
  reducers: () => ({
    deleteModalIndex: [
      null,
      {
        closeDeleteModal: () => null,
        openDeleteModal: (_, { index }) => index,
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
      { meta: DEFAULT_META, returnHiddenIndices: false },
      {
        apiSuccess: (_, { meta, returnHiddenIndices, searchQuery }) => ({
          meta,
          returnHiddenIndices,
          searchQuery,
        }),
        onPaginate: (state, { newPageIndex }) => ({
          ...state,
          meta: updateMetaPageIndex(state.meta, newPageIndex),
        }),
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    deleteModalIndexName: [() => [selectors.deleteModalIndex], (index) => index?.name ?? ''],
    deleteModalIngestionMethod: [
      () => [selectors.deleteModalIndex],
      (index: ElasticsearchViewIndex | null) =>
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
    isLoading: [
      () => [selectors.status, selectors.isFirstRequest],
      (status, isFirstRequest) => [Status.LOADING, Status.IDLE].includes(status) && isFirstRequest,
    ],
    meta: [() => [selectors.searchParams], (searchParams) => searchParams.meta],
  }),
});
