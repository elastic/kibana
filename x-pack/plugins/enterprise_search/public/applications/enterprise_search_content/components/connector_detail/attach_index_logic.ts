/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Connector } from '@kbn/search-connectors';

import { HttpError, Status } from '../../../../../common/types/api';

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

import { ConnectorViewActions, ConnectorViewLogic } from './connector_view_logic';

export interface AttachIndexActions {
  attachIndex: AttachIndexApiLogicActions['makeRequest'];
  attachIndexApiError: AttachIndexApiLogicActions['apiError'];
  attachIndexApiSuccess: AttachIndexApiLogicActions['apiSuccess'];
  callCheckIndexExists: IndexExistsApiLogicActions['makeRequest'];
  checkIndexExists: ({ indexName }: { indexName: string }) => { indexName: string };
  checkIndexExistsApiError: IndexExistsApiLogicActions['apiError'];
  checkIndexExistsApiSuccess: IndexExistsApiLogicActions['apiSuccess'];
  createIndex: CreateApiIndexApiLogicActions['makeRequest'];
  createIndexApiError: CreateApiIndexApiLogicActions['apiError'];
  createIndexApiSuccess: CreateApiIndexApiLogicActions['apiSuccess'];
  fetchConnector: ConnectorViewActions['fetchConnector'];
  setConnector(connector: Connector): Connector;
}

export interface AttachIndexValues {
  attachApiError: HttpError;
  attachApiStatus: Status;
  connector: Connector | null;
  createApiError: HttpError;
  createIndexApiStatus: Status;
  indexExists: Record<string, boolean>;
  indexExistsApiStatus: Status;
  isExistLoading: boolean;
  isLoading: boolean;
}

export const AttachIndexLogic = kea<MakeLogicType<AttachIndexValues, AttachIndexActions>>({
  actions: {
    checkIndexExists: ({ indexName }) => ({
      indexName,
    }),
    setConnector: (connector) => connector,
  },
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
        'makeRequest as callCheckIndexExists',
        'apiSuccess as checkIndexExistsApiSuccess',
        'apiError as checkIndexExistsApiError',
      ],
      ConnectorViewLogic,
      ['fetchConnector'],
    ],
    values: [
      AttachIndexApiLogic,
      ['status as attachApiStatus', 'error as attachApiError'],
      CreateApiIndexApiLogic,
      ['status as createIndexApiStatus', 'error as createApiError'],
      IndexExistsApiLogic,
      ['status as indexExistsApiStatus'],
    ],
  },
  listeners: ({ actions, values }) => ({
    attachIndexApiSuccess: () => {
      if (values.connector) {
        actions.fetchConnector({ connectorId: values.connector.id });
      }
    },
    checkIndexExists: async ({ indexName }, breakpoint) => {
      await breakpoint(200);
      actions.callCheckIndexExists({ indexName });
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
    connector: [
      null,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setConnector: (_, connector) => connector,
      },
    ],
    indexExists: [
      {},
      {
        // @ts-expect-error upgrade typescript v5.1.6
        checkIndexExistsApiSuccess: (state, { exists, indexName }) => ({
          ...state,
          [indexName]: exists,
        }),
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
