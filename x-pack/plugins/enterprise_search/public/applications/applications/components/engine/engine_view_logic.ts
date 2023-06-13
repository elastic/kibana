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

import { EnginesListLogic, EnginesListActions } from '../engines/engines_list_logic';

import { EngineNameLogic } from './engine_name_logic';

export interface EngineViewActions {
  closeDeleteEngineModal(): void;
  deleteSuccess: EnginesListActions['deleteSuccess'];
  fetchEngine: FetchSearchApplicationApiLogicActions['makeRequest'];
  fetchEngineSchema: FetchSearchApplicationApiLogicActions['makeRequest'];
  openDeleteEngineModal(): void;
}

export interface EngineViewValues {
  engineData: typeof FetchSearchApplicationApiLogic.values.data;
  engineName: typeof EngineNameLogic.values.engineName;
  engineSchemaData: typeof FetchSearchApplicationFieldCapabilitiesApiLogic.values.data;
  fetchEngineApiError?: typeof FetchSearchApplicationApiLogic.values.error;
  fetchEngineApiStatus: typeof FetchSearchApplicationApiLogic.values.status;
  fetchEngineSchemaApiError?: typeof FetchSearchApplicationFieldCapabilitiesApiLogic.values.error;
  fetchEngineSchemaApiStatus: typeof FetchSearchApplicationFieldCapabilitiesApiLogic.values.status;
  hasSchemaConflicts: boolean;
  isDeleteModalVisible: boolean;
  isLoadingEngine: boolean;
  isLoadingEngineSchema: boolean;
  schemaFields: SchemaField[];
}

export const EngineViewLogic = kea<MakeLogicType<EngineViewValues, EngineViewActions>>({
  actions: {
    closeDeleteEngineModal: true,
    openDeleteEngineModal: true,
  },
  connect: {
    actions: [
      FetchSearchApplicationApiLogic,
      ['makeRequest as fetchEngine'],
      FetchSearchApplicationFieldCapabilitiesApiLogic,
      ['makeRequest as fetchEngineSchema'],
      EnginesListLogic,
      ['deleteSuccess'],
    ],
    values: [
      EngineNameLogic,
      ['engineName'],
      FetchSearchApplicationApiLogic,
      ['data as engineData', 'status as fetchEngineApiStatus', 'error as fetchEngineApiError'],
      FetchSearchApplicationFieldCapabilitiesApiLogic,
      [
        'data as engineSchemaData',
        'status as fetchEngineSchemaApiStatus',
        'error as fetchEngineSchemaApiError',
      ],
    ],
  },
  listeners: ({ actions }) => ({
    deleteSuccess: () => {
      actions.closeDeleteEngineModal();
      KibanaLogic.values.navigateToUrl(SEARCH_APPLICATIONS_PATH);
    },
    fetchEngine: ({ name: engineName }) => {
      actions.fetchEngineSchema({ name: engineName });
    },
  }),
  path: ['enterprise_search', 'content', 'engine_view_logic'],
  reducers: () => ({
    isDeleteModalVisible: [
      false,
      {
        closeDeleteEngineModal: () => false,
        openDeleteEngineModal: () => true,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    hasSchemaConflicts: [
      () => [selectors.schemaFields],
      (data: EngineViewValues['schemaFields']) => data.some((f) => f.type === 'conflict'),
    ],
    isLoadingEngine: [
      () => [selectors.fetchEngineApiStatus, selectors.engineData],
      (status: EngineViewValues['fetchEngineApiStatus'], data: EngineViewValues['engineData']) => {
        return status === Status.IDLE || (!data && status === Status.LOADING);
      },
    ],
    isLoadingEngineSchema: [
      () => [selectors.fetchEngineSchemaApiStatus],
      (status: EngineViewValues['fetchEngineSchemaApiStatus']) =>
        [Status.LOADING, Status.IDLE].includes(status),
    ],
    schemaFields: [
      () => [selectors.engineSchemaData],
      (data: EngineViewValues['engineSchemaData']) => data?.fields || [],
    ],
  }),
});
