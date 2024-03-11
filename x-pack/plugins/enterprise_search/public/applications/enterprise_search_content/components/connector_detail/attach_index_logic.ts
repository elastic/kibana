/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Connector } from '@kbn/search-connectors';

import { Status } from '../../../../../common/types/api';

import {
  AttachIndexApiLogic,
  AttachIndexApiLogicActions,
} from '../../api/connector/attach_index_api_logic';
import {
  CreateApiIndexApiLogic,
  CreateApiIndexApiLogicActions,
} from '../../api/index/create_api_index_api_logic';
import {
  IndexExistsApiLogic,
  IndexExistsApiLogicActions,
} from '../../api/index/index_exists_api_logic';

export interface AttachIndexActions {
  attachIndex: AttachIndexApiLogicActions['makeRequest'];
  attachIndexApiError: AttachIndexApiLogicActions['apiError'];
  attachIndexApiSuccess: AttachIndexApiLogicActions['apiSuccess'];
  checkIndexExists: IndexExistsApiLogicActions['makeRequest'];
  checkIndexExistsApiError: IndexExistsApiLogicActions['apiError'];
  checkIndexExistsApiSuccess: IndexExistsApiLogicActions['apiSuccess'];
  createIndex: CreateApiIndexApiLogicActions['makeRequest'];
  createIndexApiError: CreateApiIndexApiLogicActions['apiError'];
  createIndexApiSuccess: CreateApiIndexApiLogicActions['apiSuccess'];
  setConnector(connector: Connector): Connector;
}

export interface AttachIndexValues {
  attachApiStatus: Status;
  canCreateSameNameIndex: boolean;
  connector: Connector | null;
  createIndexApiStatus: Status;
  indexExistsApiStatus: Status;
  isExistLoading: boolean;
  isLoading: boolean;
}

export const AttachIndexLogic = kea<MakeLogicType<AttachIndexValues, AttachIndexActions>>({
  actions: { setConnector: (connector) => connector },
  connect: {
    actions: [
      AttachIndexApiLogic,
      [
        'makeRequest as attachIndex',
        'apiSuccess as attachIndexApiSuccess',
        'apiError as attachIndexApiError',
      ],
      CreateApiIndexApiLogic,
      [
        'makeRequest as createIndex',
        'apiSuccess as createIndexApiSuccess',
        'apiError as createIndexApiError',
      ],
      IndexExistsApiLogic,
      [
        'makeRequest as checkIndexExists',
        'apiSuccess as checkIndexExistsApiSuccess',
        'apiError as checkIndexExistsApiError',
      ],
    ],
    values: [
      AttachIndexApiLogic,
      ['status as attachApiStatus'],
      CreateApiIndexApiLogic,
      ['status as createIndexApiStatus'],
      IndexExistsApiLogic,
      ['status as indexExistsApiStatus'],
    ],
  },
  listeners: ({ actions, values }) => ({
    attachIndexApiSuccess: () => {
      if (values.connector) {
        // TODO this is hacky
        location.reload();
      }
    },
    createIndexApiSuccess: async ({ indexName }, breakpoint) => {
      if (values.connector) {
        await breakpoint(500);
        actions.attachIndex({ connectorId: values.connector?.id, indexName });
      }
    },
  }),
  path: ['enterprise_search', 'content', 'attach_index_logic'],
  reducers: {
    canCreateSameNameIndex: [
      false,
      {
        checkIndexExistsApiSuccess: (_, { exists }) => !exists,
      },
    ],
    connector: [
      null,
      {
        setConnector: (_, connector) => connector,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    isExistLoading: [
      () => [selectors.indexExistsApiStatus],
      (indexExistsApiStatus: AttachIndexValues['indexExistsApiStatus']) =>
        Status.LOADING === indexExistsApiStatus,
    ],
    isLoading: [
      () => [selectors.attachApiStatus, selectors.createIndexApiStatus],
      (
        attachStatus: AttachIndexValues['attachApiStatus'],
        createStatus: AttachIndexValues['createIndexApiStatus']
      ) => attachStatus === Status.LOADING || createStatus === Status.LOADING,
    ],
  }),
});
