/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';
import { apiIndex, connectorIndex } from '../../__mocks__/view_index.mock';
import './_mocks_/index_name_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError } from '../../../../../common/types/api';

import { SyncStatus } from '../../../../../common/types/connectors';
import { StartSyncApiLogic } from '../../api/connector_package/start_sync_api_logic';
import { FetchIndexApiLogic } from '../../api/index/fetch_index_api_logic';

import { IngestionMethod, IngestionStatus } from '../../types';

import { indexToViewIndex } from '../../utils/indices';

import { IndexViewLogic, IndexViewValues } from './index_view_logic';

const DEFAULT_VALUES: IndexViewValues = {
  data: undefined,
  fetchIndexTimeoutId: null,
  index: undefined,
  ingestionMethod: IngestionMethod.API,
  ingestionStatus: IngestionStatus.CONNECTED,
  isSyncing: false,
  isWaitingForSync: false,
  lastUpdated: null,
  localSyncNowValue: false,
  syncStatus: null,
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
    describe('FetchIndexApiLogic.apiSuccess', () => {
      beforeEach(() => {
        IndexViewLogic.actions.createNewFetchIndexTimeout = jest.fn();
      });

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
          localSyncNowValue: true,
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

      it('should call createNewFetchIndexTimeout', () => {
        FetchIndexApiLogic.actions.apiSuccess(apiIndex);

        expect(IndexViewLogic.actions.createNewFetchIndexTimeout).toHaveBeenCalled();
      });
    });

    describe('fetchIndex.apiError', () => {
      beforeEach(() => {
        IndexViewLogic.actions.createNewFetchIndexTimeout = jest.fn();
      });

      it('should call createNewFetchIndexTimeout', () => {
        FetchIndexApiLogic.actions.apiError({} as HttpError);

        expect(IndexViewLogic.actions.createNewFetchIndexTimeout).toHaveBeenCalled();
      });
    });

    describe('startSync', () => {
      it('should call makeStartSyncRequest', async () => {
        // TODO: replace with mounting connectorIndex to FetchIndexApiDirectly to avoid
        // needing to mock out actions unrelated to test called by listeners
        IndexViewLogic.actions.createNewFetchIndexTimeout = jest.fn();
        FetchIndexApiLogic.actions.apiSuccess(connectorIndex);
        IndexViewLogic.actions.makeStartSyncRequest = jest.fn();

        IndexViewLogic.actions.startSync();
        await nextTick();

        expect(IndexViewLogic.actions.makeStartSyncRequest).toHaveBeenCalledWith({
          connectorId: '2',
        });
      });
    });

    describe('StartSyncApiLogic.apiSuccess', () => {
      it('should set localSyncNow to true', async () => {
        mount({
          localSyncNowValue: false,
        });
        StartSyncApiLogic.actions.apiSuccess({});

        expect(IndexViewLogic.values.localSyncNowValue).toEqual(true);
      });
    });
  });

  describe('listeners', () => {
    it('calls clearFlashMessages on makeStartSyncRequest', () => {
      IndexViewLogic.actions.makeStartSyncRequest({ connectorId: 'connectorId' });
      expect(mockFlashMessageHelpers.clearFlashMessages).toHaveBeenCalledTimes(1);
    });

    it('calls flashAPIErrors on apiError', () => {
      IndexViewLogic.actions.startSyncApiError({} as HttpError);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledTimes(1);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledWith({});
    });
  });
});
