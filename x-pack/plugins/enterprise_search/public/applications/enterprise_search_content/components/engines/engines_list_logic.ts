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

import { FetchEngineApiLogic } from '../../api/engines/fetch_engine_api_logic';
import {
  EnginesListAPIArguments,
  FetchEnginesAPILogic,
} from '../../api/engines/fetch_engines_api_logic';
import {} from '../engine/engine_indices_logic';

import { EngineViewActions, EngineViewLogic, EngineViewValues } from '../engine/engine_view_logic';

import { DEFAULT_META, Meta, updateMetaPageIndex } from './types';

interface EuiBasicTableOnChange {
  page: { index: number };
}

type EnginesListActions = Pick<
  Actions<EnginesListAPIArguments, EnterpriseSearchEnginesResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  closeDeleteEngineModal(): void;
  deleteEngine: DeleteEnginesApiLogicActions['makeRequest'];
  deleteError: DeleteEnginesApiLogicActions['apiError'];
  deleteSuccess: DeleteEnginesApiLogicActions['apiSuccess'];

  fetchEngines({ meta, searchQuery }: { meta: Meta; searchQuery?: string }): {
    meta: Meta;
    searchQuery?: string;
  };

  onPaginate(args: EuiBasicTableOnChange): { pageNumber: number };
  openDeleteEngineModal: (engine: EnterpriseSearchEngine) => { engine: EnterpriseSearchEngine };

  closeFetchIndicesFlyout(): void;
  openFetchEngineFlyout: (engineName: string) => { engineName: string };
  fetchEngineData: EngineViewActions['fetchEngine'] | null;
};
interface EngineListValues {
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
  status: typeof FetchEnginesAPILogic.values.status;
  isFetchEngineLoading: EngineViewValues['isLoadingEngine'];
  isFetchEngineFlyoutVisible: boolean;
  fetchEngineData: EngineViewValues['engineData']; // data from fetchEngineAPI
  fetchEngineName: string | null;
  fetchEngineApiError?: EngineViewValues['fetchEngineApiError'];
  fetchEngineApiStatus: EngineViewValues['fetchEngineApiStatus'];
}

export const EnginesListLogic = kea<MakeLogicType<EngineListValues, EnginesListActions>>({
  connect: {
    actions: [
      FetchEnginesAPILogic,
      ['makeRequest', 'apiSuccess', 'apiError'],
      DeleteEngineAPILogic,
      ['apiSuccess as deleteSuccess', 'makeRequest as deleteEngine', 'apiError as deleteError'],
      EngineViewLogic,
      ['fetchEngine as fetchEngine'],
    ],
    values: [
      FetchEnginesAPILogic,
      ['data', 'status'],
      DeleteEngineAPILogic,
      ['status as deleteStatus'],
      EngineViewLogic,
      [
        'engineData as fetchEngineData',
        'fetchEngineApiError as fetchEngineApiError',
        'fetchEngineApiStatus as fetchEngineApiStatus',
      ],
    ],
  },
  actions: {
    closeDeleteEngineModal: true,
    fetchEngines: ({ meta, searchQuery }) => ({
      meta,
      searchQuery,
    }),
    onPaginate: (args: EuiBasicTableOnChange) => ({ pageNumber: args.page.index }),
    openDeleteEngineModal: (engine) => ({ engine }),

    closeFetchIndicesFlyout: true,
    openFetchEngineFlyout: (engineName) => ({ engineName }),
  },
  path: ['enterprise_search', 'content', 'engine_list_logic'],
  reducers: ({}) => ({
    deleteModalEngine: [
      null,
      {
        closeDeleteEngineModal: () => null,
        openDeleteEngineModal: (_, { engine }) => engine,
      },
    ],
    fetchEngineName: [
      null,
      {
        closeFetchIndicesFlyout: () => null,
        openFetchEngineFlyout: (_, { engineName }) => engineName,
      },
    ],
    isDeleteModalVisible: [
      false,
      {
        closeDeleteEngineModal: () => false,
        openDeleteEngineModal: () => true,
      },
    ],
    isFetchEngineFlyoutVisible: [
      false,
      {
        closeFetchIndicesFlyout: () => false,
        openFetchEngineFlyout: () => true,
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
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    deleteModalEngineName: [() => [selectors.deleteModalEngine], (engine) => engine?.name ?? ''],

    isDeleteLoading: [
      () => [selectors.deleteStatus],
      (status: EngineListValues['deleteStatus']) => [Status.LOADING].includes(status),
    ],
    isFetchEngineLoading: [
      () => [selectors.fetchEngineApiStatus],
      (status: EngineListValues['fetchEngineApiStatus']) => [Status.LOADING].includes(status),
    ],
    isLoading: [
      () => [selectors.status],
      (status: EngineListValues['status']) => [Status.LOADING].includes(status),
    ],
    results: [() => [selectors.data], (data) => data?.results ?? []],
    meta: [() => [selectors.parameters], (parameters) => parameters.meta],
  }),
  listeners: ({ actions, values }) => ({
    deleteSuccess: () => {
      actions.closeDeleteEngineModal();
      actions.fetchEngines(values.parameters);
    },
    fetchEngines: async (input) => {
      actions.makeRequest(input);
    },
    openFetchEngineFlyout: async (input) => {
      FetchEngineApiLogic.actions.makeRequest(input);
    },
  }),
});
