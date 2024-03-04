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

export interface AttachIndexActions {
  attachIndex: AttachIndexApiLogicActions['makeRequest'];
  attachIndexApiError: AttachIndexApiLogicActions['apiError'];
  attachIndexApiSuccess: AttachIndexApiLogicActions['apiSuccess'];
  createIndex: CreateApiIndexApiLogicActions['makeRequest'];
  createIndexApiError: CreateApiIndexApiLogicActions['apiError'];
  createIndexApiSuccess: CreateApiIndexApiLogicActions['apiSuccess'];
  setConnector(connector: Connector): Connector;
}

export interface AttachIndexValues {
  attachApiStatus: Status;
  connector: Connector | null;
  createIndexApiStatus: Status;
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
    ],
    values: [
      AttachIndexApiLogic,
      ['status as attachApiStatus'],
      CreateApiIndexApiLogic,
      ['status as createIndexApiStatus'],
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
    connector: [
      null,
      {
        setConnector: (_, connector) => connector,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    isLoading: [
      () => [selectors.attachApiStatus, selectors.createIndexApiStatus],
      (attachStatus, createStatus) =>
        attachStatus === Status.LOADING || createStatus === Status.LOADING,
    ],
  }),
});
