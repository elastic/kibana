/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';
import { SchemaField } from '../../../../../common/types/engines';

import { KibanaLogic } from '../../../shared/kibana';

import {
  FetchEngineApiLogic,
  FetchEngineApiLogicActions,
} from '../../api/engines/fetch_engine_api_logic';
import { FetchEngineFieldCapabilitiesApiLogic } from '../../api/engines/fetch_engine_field_capabilities_api_logic';

import { ENGINES_PATH } from '../../routes';

import { EnginesListLogic, EnginesListActions } from '../engines/engines_list_logic';

import { EngineNameLogic } from './engine_name_logic';

export interface EngineViewActions {
  closeDeleteEngineModal(): void;
  deleteSuccess: EnginesListActions['deleteSuccess'];
  fetchEngine: FetchEngineApiLogicActions['makeRequest'];
  fetchEngineSchema: FetchEngineApiLogicActions['makeRequest'];
  openDeleteEngineModal(): void;
}

export interface EngineViewValues {
  engineData: typeof FetchEngineApiLogic.values.data;
  engineName: typeof EngineNameLogic.values.engineName;
  engineSchemaData: typeof FetchEngineFieldCapabilitiesApiLogic.values.data;
  fetchEngineApiError?: typeof FetchEngineApiLogic.values.error;
  fetchEngineApiStatus: typeof FetchEngineApiLogic.values.status;
  fetchEngineSchemaApiError?: typeof FetchEngineFieldCapabilitiesApiLogic.values.error;
  fetchEngineSchemaApiStatus: typeof FetchEngineFieldCapabilitiesApiLogic.values.status;
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
      FetchEngineApiLogic,
      ['makeRequest as fetchEngine'],
      FetchEngineFieldCapabilitiesApiLogic,
      ['makeRequest as fetchEngineSchema'],
      EnginesListLogic,
      ['deleteSuccess'],
    ],
    values: [
      EngineNameLogic,
      ['engineName'],
      FetchEngineApiLogic,
      ['data as engineData', 'status as fetchEngineApiStatus', 'error as fetchEngineApiError'],
      FetchEngineFieldCapabilitiesApiLogic,
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
      KibanaLogic.values.navigateToUrl(ENGINES_PATH);
    },
    fetchEngine: ({ engineName }) => {
      actions.fetchEngineSchema({ engineName });
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
