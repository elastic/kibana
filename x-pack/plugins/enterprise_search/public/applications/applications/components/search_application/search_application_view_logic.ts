/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';
import { SchemaField } from '../../../../../common/types/search_applications';

import { KibanaLogic } from '../../../shared/kibana';

import {
  FetchSearchApplicationApiLogic,
  FetchSearchApplicationApiLogicActions,
} from '../../api/search_applications/fetch_search_application_api_logic';
import { FetchSearchApplicationFieldCapabilitiesApiLogic } from '../../api/search_applications/fetch_search_application_field_capabilities_api_logic';

import { SEARCH_APPLICATIONS_PATH } from '../../routes';

import {
  SearchApplicationsListLogic,
  SearchApplicationsListActions,
} from '../search_applications/search_applications_list_logic';

import { SearchApplicationNameLogic } from './search_application_name_logic';

export interface SearchApplicationViewActions {
  closeDeleteSearchApplicationModal(): void;
  deleteSuccess: SearchApplicationsListActions['deleteSuccess'];
  fetchSearchApplication: FetchSearchApplicationApiLogicActions['makeRequest'];
  fetchSearchApplicationSchema: FetchSearchApplicationApiLogicActions['makeRequest'];
  openDeleteSearchApplicationModal(): void;
}

export interface SearchApplicationViewValues {
  fetchSearchApplicationApiError?: typeof FetchSearchApplicationApiLogic.values.error;
  fetchSearchApplicationApiStatus: typeof FetchSearchApplicationApiLogic.values.status;
  fetchSearchApplicationSchemaApiError?: typeof FetchSearchApplicationFieldCapabilitiesApiLogic.values.error;
  fetchSearchApplicationSchemaApiStatus: typeof FetchSearchApplicationFieldCapabilitiesApiLogic.values.status;
  hasSchemaConflicts: boolean;
  isDeleteModalVisible: boolean;
  isLoadingSearchApplication: boolean;
  isLoadingSearchApplicationSchema: boolean;
  schemaFields: SchemaField[];
  searchApplicationData: typeof FetchSearchApplicationApiLogic.values.data;
  searchApplicationName: typeof SearchApplicationNameLogic.values.searchApplicationName;
  searchApplicationSchemaData: typeof FetchSearchApplicationFieldCapabilitiesApiLogic.values.data;
}

export const SearchApplicationViewLogic = kea<
  MakeLogicType<SearchApplicationViewValues, SearchApplicationViewActions>
>({
  actions: {
    closeDeleteSearchApplicationModal: true,
    openDeleteSearchApplicationModal: true,
  },
  connect: {
    actions: [
      FetchSearchApplicationApiLogic,
      ['makeRequest as fetchSearchApplication'],
      FetchSearchApplicationFieldCapabilitiesApiLogic,
      ['makeRequest as fetchSearchApplicationSchema'],
      SearchApplicationsListLogic,
      ['deleteSuccess'],
    ],
    values: [
      SearchApplicationNameLogic,
      ['searchApplicationName'],
      FetchSearchApplicationApiLogic,
      [
        'data as searchApplicationData',
        'status as fetchSearchApplicationApiStatus',
        'error as fetchSearchApplicationApiError',
      ],
      FetchSearchApplicationFieldCapabilitiesApiLogic,
      [
        'data as searchApplicationSchemaData',
        'status as fetchSearchApplicationSchemaApiStatus',
        'error as fetchSearchApplicationSchemaApiError',
      ],
    ],
  },
  listeners: ({ actions }) => ({
    deleteSuccess: () => {
      actions.closeDeleteSearchApplicationModal();
      KibanaLogic.values.navigateToUrl(SEARCH_APPLICATIONS_PATH);
    },
    fetchSearchApplication: ({ name }) => {
      actions.fetchSearchApplicationSchema({ name });
    },
  }),
  path: ['enterprise_search', 'content', 'search_application_view_logic'],
  reducers: () => ({
    isDeleteModalVisible: [
      false,
      {
        closeDeleteSearchApplicationModal: () => false,
        openDeleteSearchApplicationModal: () => true,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    hasSchemaConflicts: [
      () => [selectors.schemaFields],
      (data: SearchApplicationViewValues['schemaFields']) =>
        data.some((f) => f.type === 'conflict'),
    ],
    isLoadingSearchApplication: [
      () => [selectors.fetchSearchApplicationApiStatus, selectors.searchApplicationData],
      (
        status: SearchApplicationViewValues['fetchSearchApplicationApiStatus'],
        data: SearchApplicationViewValues['searchApplicationData']
      ) => {
        return status === Status.IDLE || (!data && status === Status.LOADING);
      },
    ],
    isLoadingSearchApplicationSchema: [
      () => [selectors.fetchSearchApplicationSchemaApiStatus],
      (status: SearchApplicationViewValues['fetchSearchApplicationSchemaApiStatus']) =>
        [Status.LOADING, Status.IDLE].includes(status),
    ],
    schemaFields: [
      () => [selectors.searchApplicationSchemaData],
      (data: SearchApplicationViewValues['searchApplicationSchemaData']) => data?.fields || [],
    ],
  }),
});
