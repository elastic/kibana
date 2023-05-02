/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';

import {
  EnterpriseSearchEngine,
  EnterpriseSearchEngineDetails,
  EnterpriseSearchEnginesResponse,
} from '../../../../../common/types/engines';
import { Page } from '../../../../../common/types/pagination';

import { Actions } from '../../../shared/api_logic/create_api_logic';

import {
  DeleteEngineAPILogic,
  DeleteEnginesApiLogicActions,
} from '../../api/engines/delete_engines_api_logic';

import {
  EnginesListAPIArguments,
  FetchEnginesAPILogic,
} from '../../api/engines/fetch_engines_api_logic';

import { DEFAULT_META, updateMetaPageIndex, updateMetaTotalState } from './types';

interface EuiBasicTableOnChange {
  page: { index: number };
}

export type EnginesListActions = Pick<
  Actions<EnginesListAPIArguments, EnterpriseSearchEnginesResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  closeDeleteEngineModal(): void;

  deleteEngine: DeleteEnginesApiLogicActions['makeRequest'];
  deleteError: DeleteEnginesApiLogicActions['apiError'];
  deleteSuccess: DeleteEnginesApiLogicActions['apiSuccess'];

  fetchEngines(): void;

  onPaginate(args: EuiBasicTableOnChange): { pageNumber: number };
  openDeleteEngineModal: (engine: EnterpriseSearchEngine | EnterpriseSearchEngineDetails) => {
    engine: EnterpriseSearchEngine;
  };
  setIsFirstRequest(): void;
  setSearchQuery(searchQuery: string): { searchQuery: string };
};

interface EngineListValues {
  data: typeof FetchEnginesAPILogic.values.data;
  deleteModalEngine: EnterpriseSearchEngine | null;
  deleteModalEngineName: string;
  deleteStatus: typeof DeleteEngineAPILogic.values.status;
  hasNoEngines: boolean;
  isDeleteLoading: boolean;
  isDeleteModalVisible: boolean;
  isFirstRequest: boolean;
  isLoading: boolean;
  meta: Page;
  parameters: { count: number; meta: Page; searchQuery?: string }; // Added this variable to store to the search Query value as well
  results: EnterpriseSearchEngine[]; // stores engine list value from data
  searchQuery: string;
  status: typeof FetchEnginesAPILogic.values.status;
}

export const EnginesListLogic = kea<MakeLogicType<EngineListValues, EnginesListActions>>({
  actions: {
    closeDeleteEngineModal: true,
    fetchEngines: true,
    onPaginate: (args: EuiBasicTableOnChange) => ({ pageNumber: args.page.index }),
    openDeleteEngineModal: (engine) => ({ engine }),
    setIsFirstRequest: true,
    setSearchQuery: (searchQuery: string) => ({ searchQuery }),
  },
  connect: {
    actions: [
      FetchEnginesAPILogic,
      ['makeRequest', 'apiSuccess', 'apiError'],
      DeleteEngineAPILogic,
      ['apiSuccess as deleteSuccess', 'makeRequest as deleteEngine', 'apiError as deleteError'],
    ],
    values: [
      FetchEnginesAPILogic,
      ['data', 'status'],
      DeleteEngineAPILogic,
      ['status as deleteStatus'],
    ],
  },
  listeners: ({ actions, values }) => ({
    deleteSuccess: () => {
      actions.closeDeleteEngineModal();
      actions.fetchEngines();
    },
    fetchEngines: async () => {
      actions.makeRequest(values.parameters);
    },
  }),

  path: ['enterprise_search', 'content', 'engine_list_logic'],

  reducers: ({}) => ({
    deleteModalEngine: [
      null,
      {
        closeDeleteEngineModal: () => null,
        openDeleteEngineModal: (_, { engine }) => engine,
      },
    ],

    isDeleteModalVisible: [
      false,
      {
        closeDeleteEngineModal: () => false,
        openDeleteEngineModal: () => true,
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

    parameters: [
      { count: 0, meta: DEFAULT_META },
      {
        apiSuccess: (state, { count }) => ({
          ...state,
          count,
          meta: updateMetaTotalState(state.meta, count), // update total count from response
        }),
        onPaginate: (state, { pageNumber }) => ({
          ...state,
          meta: updateMetaPageIndex(state.meta, pageNumber),
        }),
        setSearchQuery: (state, { searchQuery }) => ({
          ...state,
          searchQuery: searchQuery ? searchQuery : undefined,
        }),
      },
    ],
    searchQuery: [
      '',
      {
        setSearchQuery: (_, { searchQuery }) => searchQuery,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    deleteModalEngineName: [() => [selectors.deleteModalEngine], (engine) => engine?.name ?? ''],
    hasNoEngines: [
      () => [selectors.data, selectors.results],
      (data: EngineListValues['data'], results: EngineListValues['results']) =>
        (data?.params?.from === 0 && results.length === 0 && !data?.params?.q) ?? false,
    ],

    isDeleteLoading: [
      () => [selectors.deleteStatus],
      (status: EngineListValues['deleteStatus']) => [Status.LOADING].includes(status),
    ],
    isLoading: [
      () => [selectors.status, selectors.isFirstRequest],
      (status: EngineListValues['status'], isFirstRequest: EngineListValues['isFirstRequest']) =>
        [Status.LOADING, Status.IDLE].includes(status) && isFirstRequest,
    ],
    meta: [() => [selectors.parameters], (parameters) => parameters.meta],
    results: [() => [selectors.data], (data) => data?.results ?? []],
  }),
});
