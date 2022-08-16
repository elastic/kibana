/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types';
import { HttpError, Status } from '../../../../../common/types/api';
import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';
import { DEFAULT_META } from '../../../shared/constants';
import { flashAPIErrors, clearFlashMessages } from '../../../shared/flash_messages';
import { updateMetaPageIndex } from '../../../shared/table_pagination';
import { FetchIndicesAPILogic } from '../../api/index/fetch_indices_api_logic';
import { ElasticsearchViewIndex } from '../../types';
import { indexToViewIndex } from '../../utils/indices';

export interface IndicesActions {
  apiError(error: HttpError): HttpError;
  apiSuccess({
    indices,
    isInitialRequest,
    meta,
  }: {
    indices: ElasticsearchIndexWithIngestion[];
    isInitialRequest: boolean;
    meta: Meta;
  }): {
    indices: ElasticsearchIndexWithIngestion[];
    isInitialRequest: boolean;
    meta: Meta;
  };
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
  setIsFirstRequest(): boolean;
}
export interface IndicesValues {
  data: typeof FetchIndicesAPILogic.values.data;
  hasNoIndices: boolean;
  indices: ElasticsearchViewIndex[];
  isFirstRequest: boolean;
  isLoading: boolean;
  meta: Meta;
  status: typeof FetchIndicesAPILogic.values.status;
}

export const IndicesLogic = kea<MakeLogicType<IndicesValues, IndicesActions>>({
  actions: {
    fetchIndices: ({ meta, returnHiddenIndices, searchQuery }) => ({
      meta,
      returnHiddenIndices,
      searchQuery,
    }),
    onPaginate: (newPageIndex) => ({ newPageIndex }),
    setIsFirstRequest: () => true,
  },
  connect: {
    actions: [FetchIndicesAPILogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [FetchIndicesAPILogic, ['data', 'status']],
  },
  listeners: ({ actions }) => ({
    apiError: (e) => flashAPIErrors(e),
    fetchIndices: async (input, breakpoint) => {
      await breakpoint(150);
      actions.makeRequest(input);
    },
    makeRequest: () => clearFlashMessages(),
  }),
  path: ['enterprise_search', 'content', 'indices_logic'],
  reducers: () => ({
    isFirstRequest: [
      true,
      {
        apiError: () => false,
        apiSuccess: () => false,
        setIsFirstRequest: () => true,
      },
    ],
    meta: [
      DEFAULT_META,
      {
        apiSuccess: (_, { meta }) => meta,
        onPaginate: (state, { newPageIndex }) => updateMetaPageIndex(state, newPageIndex),
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
    isLoading: [
      () => [selectors.status, selectors.isFirstRequest],
      (status, isFirstRequest) => [Status.LOADING, Status.IDLE].includes(status) && isFirstRequest,
    ],
  }),
});
