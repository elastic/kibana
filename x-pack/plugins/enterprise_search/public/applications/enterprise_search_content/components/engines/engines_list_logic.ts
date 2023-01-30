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
  EnterpriseSearchEnginesResponse,
} from '../../../../../common/types/engines';

import { Actions } from '../../../shared/api_logic/create_api_logic';

import {
  DeleteEngineAPILogic,
  DeleteEnginesApiLogicActions,
} from '../../api/engines/delete_engines_api_logic';

import {
  EnginesListAPIArguments,
  FetchEnginesAPILogic,
} from '../../api/engines/fetch_engines_api_logic';

import { DEFAULT_META, Meta, updateMetaPageIndex } from './types';

interface EuiBasicTableOnChange {
  page: { index: number };
}

type EnginesListActions = Pick<
  Actions<EnginesListAPIArguments, EnterpriseSearchEnginesResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  closeDeleteEngineModal(): void;
  closeEngineCreate(): void;
  deleteEngine: DeleteEnginesApiLogicActions['makeRequest'];
  deleteError: DeleteEnginesApiLogicActions['apiError'];
  deleteSuccess: DeleteEnginesApiLogicActions['apiSuccess'];

  fetchEngines(): void;

  onPaginate(args: EuiBasicTableOnChange): { pageNumber: number };
  openDeleteEngineModal: (engine: EnterpriseSearchEngine) => { engine: EnterpriseSearchEngine };
  openEngineCreate(): void;
  setSearchQuery(searchQuery: string): { searchQuery: string };
};
interface EngineListValues {
  createEngineFlyoutOpen: boolean;
  data: typeof FetchEnginesAPILogic.values.data;
  deleteModalEngine: EnterpriseSearchEngine | null;
  deleteModalEngineName: string;
  deleteStatus: typeof DeleteEngineAPILogic.values.status;
  isDeleteLoading: boolean;
  isDeleteModalVisible: boolean;
  isLoading: boolean;
  meta: Meta;
  parameters: { meta: Meta; searchQuery?: string }; // Added this variable to store to the search Query value as well
  results: EnterpriseSearchEngine[]; // stores engine list value from data
  searchQuery: string;
  status: typeof FetchEnginesAPILogic.values.status;
}

export const EnginesListLogic = kea<MakeLogicType<EngineListValues, EnginesListActions>>({
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
  actions: {
    closeDeleteEngineModal: true,
    closeEngineCreate: true,
    fetchEngines: true,
    onPaginate: (args: EuiBasicTableOnChange) => ({ pageNumber: args.page.index }),
    openDeleteEngineModal: (engine) => ({ engine }),
    openEngineCreate: true,
    setSearchQuery: (searchQuery: string) => ({ searchQuery }),
  },
  path: ['enterprise_search', 'content', 'engine_list_logic'],
  reducers: ({}) => ({
    createEngineFlyoutOpen: [
      false,
      {
        closeEngineCreate: () => false,
        openEngineCreate: () => true,
      },
    ],
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

    parameters: [
      { meta: DEFAULT_META },
      {
        apiSuccess: (_, { meta }) => ({
          meta,
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

    isDeleteLoading: [
      () => [selectors.deleteStatus],
      (status: EngineListValues['deleteStatus']) => [Status.LOADING].includes(status),
    ],
    isLoading: [
      () => [selectors.status],
      (status: EngineListValues['status']) => [Status.LOADING, Status.IDLE].includes(status),
    ],
    results: [() => [selectors.data], (data) => data?.results ?? []],
    meta: [() => [selectors.parameters], (parameters) => parameters.meta],
  }),
  listeners: ({ actions, values }) => ({
    deleteSuccess: () => {
      actions.closeDeleteEngineModal();
      actions.fetchEngines();
    },
    fetchEngines: async () => {
      actions.makeRequest(values.parameters);
    },
  }),
});
