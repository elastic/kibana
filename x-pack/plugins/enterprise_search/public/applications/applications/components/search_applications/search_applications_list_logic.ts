/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';

import { Page } from '../../../../../common/types/pagination';
import {
  EnterpriseSearchApplication,
  EnterpriseSearchApplicationDetails,
  EnterpriseSearchApplicationsResponse,
} from '../../../../../common/types/search_applications';

import { Actions } from '../../../shared/api_logic/create_api_logic';

import {
  DeleteSearchApplicationAPILogic,
  DeleteSearchApplicationApiLogicActions,
} from '../../api/search_applications/delete_search_application_api_logic';

import {
  SearchApplicationsListAPIArguments,
  FetchSearchApplicationsAPILogic,
} from '../../api/search_applications/fetch_search_applications_api_logic';

import { DEFAULT_META, updateMetaPageIndex, updateMetaTotalState } from './types';

interface EuiBasicTableOnChange {
  page: { index: number };
}

export type SearchApplicationsListActions = Pick<
  Actions<SearchApplicationsListAPIArguments, EnterpriseSearchApplicationsResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  closeDeleteSearchApplicationModal(): void;

  deleteError: DeleteSearchApplicationApiLogicActions['apiError'];
  deleteSearchApplication: DeleteSearchApplicationApiLogicActions['makeRequest'];
  deleteSuccess: DeleteSearchApplicationApiLogicActions['apiSuccess'];

  fetchSearchApplications(): void;

  onPaginate(args: EuiBasicTableOnChange): { pageNumber: number };
  openDeleteSearchApplicationModal: (
    searchApplication: EnterpriseSearchApplication | EnterpriseSearchApplicationDetails
  ) => {
    searchApplication: EnterpriseSearchApplication;
  };
  setIsFirstRequest(): void;
  setSearchQuery(searchQuery: string): { searchQuery: string };
};

interface SearchApplicationsListValues {
  data: typeof FetchSearchApplicationsAPILogic.values.data;
  deleteModalSearchApplication: EnterpriseSearchApplication | null;
  deleteModalSearchApplicationName: string;
  deleteStatus: typeof DeleteSearchApplicationAPILogic.values.status;
  hasNoSearchApplications: boolean;
  isDeleteLoading: boolean;
  isDeleteModalVisible: boolean;
  isFirstRequest: boolean;
  isLoading: boolean;
  meta: Page;
  parameters: { count: number; meta: Page; searchQuery?: string }; // Added this variable to store to the search Query value as well
  results: EnterpriseSearchApplication[]; // stores search applications list value from data
  searchQuery: string;
  status: typeof FetchSearchApplicationsAPILogic.values.status;
}

export const SearchApplicationsListLogic = kea<
  MakeLogicType<SearchApplicationsListValues, SearchApplicationsListActions>
>({
  actions: {
    closeDeleteSearchApplicationModal: true,
    fetchSearchApplications: true,
    onPaginate: (args: EuiBasicTableOnChange) => ({ pageNumber: args.page.index }),
    openDeleteSearchApplicationModal: (searchApplication) => ({ searchApplication }),
    setIsFirstRequest: true,
    setSearchQuery: (searchQuery: string) => ({ searchQuery }),
  },
  connect: {
    actions: [
      FetchSearchApplicationsAPILogic,
      ['makeRequest', 'apiSuccess', 'apiError'],
      DeleteSearchApplicationAPILogic,
      [
        'apiSuccess as deleteSuccess',
        'makeRequest as deleteSearchApplication',
        'apiError as deleteError',
      ],
    ],
    values: [
      FetchSearchApplicationsAPILogic,
      ['data', 'status'],
      DeleteSearchApplicationAPILogic,
      ['status as deleteStatus'],
    ],
  },
  listeners: ({ actions, values }) => ({
    deleteSuccess: () => {
      actions.closeDeleteSearchApplicationModal();
      actions.fetchSearchApplications();
    },
    fetchSearchApplications: async () => {
      actions.makeRequest(values.parameters);
    },
  }),

  path: ['enterprise_search', 'search_applications', 'search_applications_list_logic'],

  reducers: ({}) => ({
    deleteModalSearchApplication: [
      null,
      {
        closeDeleteSearchApplicationModal: () => null,
        // @ts-expect-error upgrade typescript v5.1.6
        openDeleteSearchApplicationModal: (_, { searchApplication }) => searchApplication,
      },
    ],

    isDeleteModalVisible: [
      false,
      {
        closeDeleteSearchApplicationModal: () => false,
        openDeleteSearchApplicationModal: () => true,
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
        // @ts-expect-error upgrade typescript v5.1.6
        apiSuccess: (state, { count }) => ({
          ...state,
          count,
          meta: updateMetaTotalState(state.meta, count), // update total count from response
        }),
        // @ts-expect-error upgrade typescript v5.1.6
        onPaginate: (state, { pageNumber }) => ({
          ...state,
          meta: updateMetaPageIndex(state.meta, pageNumber),
        }),
        // @ts-expect-error upgrade typescript v5.1.6
        setSearchQuery: (state, { searchQuery }) => ({
          ...state,
          searchQuery: searchQuery ? searchQuery : undefined,
        }),
      },
    ],
    searchQuery: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setSearchQuery: (_, { searchQuery }) => searchQuery,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    deleteModalSearchApplicationName: [
      () => [selectors.deleteModalSearchApplication],
      (searchApplication) => searchApplication?.name ?? '',
    ],
    hasNoSearchApplications: [
      () => [selectors.data, selectors.results],
      (
        data: SearchApplicationsListValues['data'],
        results: SearchApplicationsListValues['results']
      ) => (data?.params?.from === 0 && results.length === 0 && !data?.params?.q) ?? false,
    ],

    isDeleteLoading: [
      () => [selectors.deleteStatus],
      (status: SearchApplicationsListValues['deleteStatus']) => [Status.LOADING].includes(status),
    ],
    isLoading: [
      () => [selectors.status, selectors.isFirstRequest],
      (
        status: SearchApplicationsListValues['status'],
        isFirstRequest: SearchApplicationsListValues['isFirstRequest']
      ) => [Status.LOADING, Status.IDLE].includes(status) && isFirstRequest,
    ],
    meta: [() => [selectors.parameters], (parameters) => parameters.meta],
    results: [() => [selectors.data], (data) => data?.results ?? []],
  }),
});
