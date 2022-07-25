/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';

import { apiIndex, connectorIndex } from '../../__mocks__/view_index.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError } from '../../../../../common/types/api';

import { SyncStatus } from '../../../../../common/types/connectors';
import { StartSyncApiLogic } from '../../api/connector_package/start_sync_api_logic';
import { FetchIndexApiLogic } from '../../api/index/fetch_index_api_logic';

import { IngestionMethod, IngestionStatus } from '../../types';

import { indexToViewIndex } from '../../utils/indices';

import { IndexViewLogic } from './index_view_logic';

const DEFAULT_VALUES = {
  data: undefined,
  index: undefined,
  ingestionMethod: IngestionMethod.API,
  ingestionStatus: IngestionStatus.CONNECTED,
  isSyncing: false,
  isWaitingForSync: false,
  lastUpdated: null,
  localSyncNowValue: false,
  syncStatus: undefined,
};

const CONNECTOR_VALUES = {
  ...DEFAULT_VALUES,
  data: connectorIndex,
  index: indexToViewIndex(connectorIndex),
  ingestionMethod: IngestionMethod.CONNECTOR,
  ingestionStatus: IngestionStatus.INCOMPLETE,
  lastUpdated: 'never',
};

describe('IndexViewLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(StartSyncApiLogic);
  const { mount: fetchIndexMount } = new LogicMounter(FetchIndexApiLogic);
  const { mount } = new LogicMounter(IndexViewLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    apiLogicMount();
    fetchIndexMount();
    mount();
  });

  it('has expected default values', () => {
    expect(IndexViewLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('fetchIndex.apiSuccess', () => {
      it('should update values', () => {
        FetchIndexApiLogic.actions.apiSuccess({
          ...connectorIndex,
          connector: { ...connectorIndex.connector!, sync_now: true },
        });
        expect(IndexViewLogic.values).toEqual({
          ...CONNECTOR_VALUES,
          data: {
            ...CONNECTOR_VALUES.data,
            connector: { ...CONNECTOR_VALUES.data.connector, sync_now: true },
          },
          index: {
            ...CONNECTOR_VALUES.index,
            connector: { ...CONNECTOR_VALUES.index.connector, sync_now: true },
          },
          isWaitingForSync: true,
          syncStatus: SyncStatus.COMPLETED,
        });
      });
      it('should update values with no connector', () => {
        FetchIndexApiLogic.actions.apiSuccess(apiIndex);
        expect(IndexViewLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: apiIndex,
          index: apiIndex,
        });
      });
    });
    describe('startSync', () => {
      it('should call makeRequest', async () => {
        FetchIndexApiLogic.actions.apiSuccess(connectorIndex);
        IndexViewLogic.actions.makeRequest = jest.fn();
        IndexViewLogic.actions.startSync();
        await nextTick();
        expect(IndexViewLogic.actions.makeRequest).toHaveBeenCalledWith({
          connectorId: '2',
        });
        expect(IndexViewLogic.values).toEqual({
          ...CONNECTOR_VALUES,
          syncStatus: SyncStatus.COMPLETED,
        });
      });
    });
    describe('apiSuccess', () => {
      it('should set localSyncNow to true', async () => {
        FetchIndexApiLogic.actions.apiSuccess(connectorIndex);
        StartSyncApiLogic.actions.apiSuccess({});
        expect(IndexViewLogic.values).toEqual({
          ...CONNECTOR_VALUES,
          isWaitingForSync: true,
          localSyncNowValue: true,
          syncStatus: SyncStatus.COMPLETED,
        });
      });
    });
  });

  describe('listeners', () => {
    it('calls clearFlashMessages on makeRequest', () => {
      IndexViewLogic.actions.makeRequest({ connectorId: 'connectorId' });
      expect(mockFlashMessageHelpers.clearFlashMessages).toHaveBeenCalledTimes(1);
    });
    it('calls flashAPIErrors on apiError', () => {
      IndexViewLogic.actions.apiError({} as HttpError);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledTimes(1);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledWith({});
    });
  });
});
