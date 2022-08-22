/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';

import { indices } from '../../__mocks__/search_indices.mock';

import { connectorIndex, elasticsearchViewIndices } from '../../__mocks__/view_index.mock';

import moment from 'moment';

import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError, Status } from '../../../../../common/types/api';

import { ConnectorStatus, SyncStatus } from '../../../../../common/types/connectors';
import { DEFAULT_META } from '../../../shared/constants';

import { FetchIndicesAPILogic } from '../../api/index/fetch_indices_api_logic';

import { IngestionStatus } from '../../types';

import { IndicesLogic } from './indices_logic';

const DEFAULT_VALUES = {
  data: undefined,
  hasNoIndices: false,
  indices: [],
  isFirstRequest: true,
  isLoading: true,
  meta: DEFAULT_META,
  status: Status.IDLE,
};

describe('IndicesLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(FetchIndicesAPILogic);
  const { mount } = new LogicMounter(IndicesLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    apiLogicMount();
    mount();
  });

  it('has expected default values', () => {
    expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onPaginate', () => {
      it('updates meta with newPageIndex', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.onPaginate(3);
        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          meta: {
            page: {
              ...DEFAULT_META.page,
              current: 3,
            },
          },
        });
      });
    });
  });
  describe('reducers', () => {
    describe('meta', () => {
      it('updates when apiSuccess listener triggered', () => {
        const newMeta = {
          page: {
            current: 2,
            size: 5,
            total_pages: 10,
            total_results: 52,
          },
        };
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices,
          isInitialRequest: true,
          meta: newMeta,
        });
        expect(IndicesLogic.values).toEqual({
          data: {
            indices,
            isInitialRequest: true,
            meta: newMeta,
          },
          hasNoIndices: false,
          indices: elasticsearchViewIndices,
          isFirstRequest: false,
          isLoading: false,
          meta: newMeta,
          status: Status.SUCCESS,
        });
      });
    });
    describe('hasNoIndices', () => {
      it('updates to true when apiSuccess returns initialRequest: true with no indices', () => {
        const meta = {
          page: {
            current: 1,
            size: 0,
            total_pages: 1,
            total_results: 0,
          },
        };
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: [],
          isInitialRequest: true,
          meta,
        });
        expect(IndicesLogic.values).toEqual({
          data: {
            indices: [],
            isInitialRequest: true,
            meta,
          },
          hasNoIndices: true,
          indices: [],
          isFirstRequest: false,
          isLoading: false,
          meta,
          status: Status.SUCCESS,
        });
      });
      it('updates to false when apiSuccess returns initialRequest: false with no indices', () => {
        const meta = {
          page: {
            current: 1,
            size: 0,
            total_pages: 1,
            total_results: 0,
          },
        };
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: [],
          isInitialRequest: false,
          meta,
        });
        expect(IndicesLogic.values).toEqual({
          data: {
            indices: [],
            isInitialRequest: false,
            meta,
          },
          hasNoIndices: false,
          indices: [],
          isFirstRequest: false,
          isLoading: false,
          meta,
          status: Status.SUCCESS,
        });
      });
    });
  });

  describe('listeners', () => {
    it('calls clearFlashMessages on new makeRequest', () => {
      IndicesLogic.actions.makeRequest({ meta: DEFAULT_META, returnHiddenIndices: false });
      expect(mockFlashMessageHelpers.clearFlashMessages).toHaveBeenCalledTimes(1);
    });
    it('calls flashAPIErrors on apiError', () => {
      IndicesLogic.actions.apiError({} as HttpError);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledTimes(1);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledWith({});
    });
    it('calls makeRequest on fetchIndices', async () => {
      jest.useFakeTimers();
      IndicesLogic.actions.makeRequest = jest.fn();
      IndicesLogic.actions.fetchIndices({ meta: DEFAULT_META, returnHiddenIndices: false });
      jest.advanceTimersByTime(150);
      await nextTick();
      expect(IndicesLogic.actions.makeRequest).toHaveBeenCalledWith({
        meta: DEFAULT_META,
        returnHiddenIndices: false,
      });
    });
    it('calls makeRequest once on two fetchIndices calls within 150ms', async () => {
      jest.useFakeTimers();
      IndicesLogic.actions.makeRequest = jest.fn();
      IndicesLogic.actions.fetchIndices({ meta: DEFAULT_META, returnHiddenIndices: false });
      jest.advanceTimersByTime(130);
      await nextTick();
      IndicesLogic.actions.fetchIndices({ meta: DEFAULT_META, returnHiddenIndices: false });
      jest.advanceTimersByTime(150);
      await nextTick();
      expect(IndicesLogic.actions.makeRequest).toHaveBeenCalledWith({
        meta: DEFAULT_META,
        returnHiddenIndices: false,
      });
      expect(IndicesLogic.actions.makeRequest).toHaveBeenCalledTimes(1);
    });
    it('calls makeRequest twice on two fetchIndices calls outside 150ms', async () => {
      jest.useFakeTimers();
      IndicesLogic.actions.makeRequest = jest.fn();
      IndicesLogic.actions.fetchIndices({ meta: DEFAULT_META, returnHiddenIndices: false });
      jest.advanceTimersByTime(150);
      await nextTick();
      IndicesLogic.actions.fetchIndices({ meta: DEFAULT_META, returnHiddenIndices: false });
      jest.advanceTimersByTime(150);
      await nextTick();
      expect(IndicesLogic.actions.makeRequest).toHaveBeenCalledWith({
        meta: DEFAULT_META,
        returnHiddenIndices: false,
      });
      expect(IndicesLogic.actions.makeRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('selectors', () => {
    describe('indices', () => {
      it('updates when apiSuccess listener triggered', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: elasticsearchViewIndices,
          isInitialRequest: true,
          meta: DEFAULT_META,
        });

        expect(IndicesLogic.values).toEqual({
          data: {
            indices: elasticsearchViewIndices,
            isInitialRequest: true,
            meta: DEFAULT_META,
          },
          hasNoIndices: false,
          indices: elasticsearchViewIndices,
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          status: Status.SUCCESS,
        });
      });
      it('updates ingestionStatus for connector to error when last_seen is more than half an hour ago', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        const date = moment();
        const lastSeen = date.subtract(31, 'minutes').format();
        IndicesLogic.actions.apiSuccess({
          indices: [
            {
              ...connectorIndex,
              connector: {
                ...connectorIndex.connector!,
                last_seen: lastSeen,
                status: ConnectorStatus.CONNECTED,
              },
            },
          ],
          isInitialRequest: true,
          meta: DEFAULT_META,
        });

        expect(IndicesLogic.values).toEqual({
          data: {
            indices: [
              {
                ...connectorIndex,
                connector: {
                  ...connectorIndex.connector!,
                  last_seen: lastSeen,
                  status: ConnectorStatus.CONNECTED,
                },
              },
            ],
            isInitialRequest: true,
            meta: DEFAULT_META,
          },
          hasNoIndices: false,
          indices: [
            {
              ...connectorIndex,
              connector: {
                ...connectorIndex.connector,
                last_seen: lastSeen,
                status: ConnectorStatus.CONNECTED,
              },
              ingestionStatus: IngestionStatus.ERROR,
            },
          ],
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          status: Status.SUCCESS,
        });
      });
      it('updates ingestionStatus for connector to connected when connected', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: [
            {
              ...connectorIndex,
              connector: { ...connectorIndex.connector, status: ConnectorStatus.CONNECTED },
            },
          ],
          isInitialRequest: true,
          meta: DEFAULT_META,
        });

        expect(IndicesLogic.values).toEqual({
          data: {
            indices: [
              {
                ...connectorIndex,
                connector: { ...connectorIndex.connector, status: ConnectorStatus.CONNECTED },
              },
            ],
            isInitialRequest: true,
            meta: DEFAULT_META,
          },
          hasNoIndices: false,
          indices: [
            {
              ...connectorIndex,
              connector: {
                ...connectorIndex.connector,
                status: ConnectorStatus.CONNECTED,
              },
              ingestionStatus: IngestionStatus.CONNECTED,
            },
          ],
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          status: Status.SUCCESS,
        });
      });
      it('updates ingestionStatus for connector to error when error is present', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: [
            {
              ...connectorIndex,
              connector: { ...connectorIndex.connector!, status: ConnectorStatus.ERROR },
            },
          ],
          isInitialRequest: true,
          meta: DEFAULT_META,
        });

        expect(IndicesLogic.values).toEqual({
          data: {
            indices: [
              {
                ...connectorIndex,
                connector: { ...connectorIndex.connector!, status: ConnectorStatus.ERROR },
              },
            ],
            isInitialRequest: true,
            meta: DEFAULT_META,
          },
          hasNoIndices: false,
          indices: [
            {
              ...connectorIndex,
              connector: { ...connectorIndex.connector, status: ConnectorStatus.ERROR },
              ingestionStatus: IngestionStatus.ERROR,
            },
          ],
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          status: Status.SUCCESS,
        });
      });
      it('updates ingestionStatus for connector to sync error when sync error is present', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: [
            {
              ...connectorIndex,
              connector: {
                ...connectorIndex.connector!,
                last_sync_status: SyncStatus.ERROR,
                status: ConnectorStatus.CONNECTED,
              },
            },
          ],
          isInitialRequest: true,
          meta: DEFAULT_META,
        });

        expect(IndicesLogic.values).toEqual({
          data: {
            indices: [
              {
                ...connectorIndex,
                connector: {
                  ...connectorIndex.connector!,
                  last_sync_status: SyncStatus.ERROR,
                  status: ConnectorStatus.CONNECTED,
                },
              },
            ],
            isInitialRequest: true,
            meta: DEFAULT_META,
          },
          hasNoIndices: false,
          indices: [
            {
              ...connectorIndex,
              connector: {
                ...connectorIndex.connector,
                last_sync_status: SyncStatus.ERROR,
                status: ConnectorStatus.CONNECTED,
              },
              ingestionStatus: IngestionStatus.SYNC_ERROR,
            },
          ],
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          status: Status.SUCCESS,
        });
      });
    });
  });
});
