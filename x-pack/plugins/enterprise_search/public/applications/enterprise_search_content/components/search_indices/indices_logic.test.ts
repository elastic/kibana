/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';

import { indices } from '../../__mocks__/search_indices.mock';

import { HttpError, Status } from '../../../../../common/types/api';

import { ConnectorStatus, SyncStatus } from '../../../../../common/types/connectors';
import { DEFAULT_META } from '../../../shared/constants';

import { FetchIndicesAPILogic } from '../../api/index/fetch_indices_api_logic';

import { IndicesLogic, IngestionMethod, IngestionStatus, ViewSearchIndex } from './indices_logic';

const DEFAULT_VALUES = {
  data: undefined,
  hasNoIndices: false,
  indices: [],
  isLoading: false,
  meta: DEFAULT_META,
  status: Status.IDLE,
};

const apiIndex: ViewSearchIndex = {
  ingestionMethod: IngestionMethod.API,
  ingestionStatus: IngestionStatus.CONNECTED,
  lastUpdated: null,
  name: 'api',
  total: {
    docs: {
      count: 1,
      deleted: 0,
    },
    store: { size_in_bytes: '8024' },
  },
};
const connectorIndex: ViewSearchIndex = {
  connector: {
    api_key_id: null,
    configuration: {},
    id: '2',
    index_name: 'connector',
    last_seen: null,
    last_synced: null,
    scheduling: {
      enabled: false,
      interval: '',
    },
    service_type: null,
    status: ConnectorStatus.CONFIGURED,
    sync_error: null,
    sync_now: false,
    sync_status: SyncStatus.COMPLETED,
  },
  ingestionMethod: IngestionMethod.CONNECTOR,
  ingestionStatus: IngestionStatus.INCOMPLETE,
  lastUpdated: 'never',
  name: 'connector',
  total: {
    docs: {
      count: 1,
      deleted: 0,
    },
    store: { size_in_bytes: '8024' },
  },
};
const crawlerIndex: ViewSearchIndex = {
  crawler: {
    id: '3',
    index_name: 'crawler',
  },
  ingestionMethod: IngestionMethod.CRAWLER,
  ingestionStatus: IngestionStatus.INCOMPLETE,
  lastUpdated: null,
  name: 'crawler',
  total: {
    docs: {
      count: 1,
      deleted: 0,
    },
    store: { size_in_bytes: '8024' },
  },
};

const viewSearchIndices = [apiIndex, connectorIndex, crawlerIndex];

describe('IndicesLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(FetchIndicesAPILogic);
  const { mount } = new LogicMounter(IndicesLogic);

  beforeEach(() => {
    jest.clearAllMocks();
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
          indices: viewSearchIndices,
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
  });

  describe('selectors', () => {
    describe('indices', () => {
      it('updates when apiSuccess listener triggered', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: viewSearchIndices,
          isInitialRequest: true,
          meta: DEFAULT_META,
        });

        expect(IndicesLogic.values).toEqual({
          data: {
            indices: viewSearchIndices,
            isInitialRequest: true,
            meta: DEFAULT_META,
          },
          hasNoIndices: false,
          indices: viewSearchIndices,
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
              ...indices[1],
              connector: { ...indices[1].connector!, status: ConnectorStatus.CONNECTED },
            },
          ],
          isInitialRequest: true,
          meta: DEFAULT_META,
        });

        expect(IndicesLogic.values).toEqual({
          data: {
            indices: [
              {
                ...indices[1],
                connector: { ...indices[1].connector!, status: ConnectorStatus.CONNECTED },
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
              ...indices[1],
              connector: { ...indices[1].connector!, status: ConnectorStatus.ERROR },
            },
          ],
          isInitialRequest: true,
          meta: DEFAULT_META,
        });

        expect(IndicesLogic.values).toEqual({
          data: {
            indices: [
              {
                ...indices[1],
                connector: { ...indices[1].connector!, status: ConnectorStatus.ERROR },
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
              ...indices[1],
              connector: {
                ...indices[1].connector!,
                status: ConnectorStatus.CONNECTED,
                sync_status: SyncStatus.ERROR,
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
                ...indices[1],
                connector: {
                  ...indices[1].connector!,
                  status: ConnectorStatus.CONNECTED,
                  sync_status: SyncStatus.ERROR,
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
                status: ConnectorStatus.CONNECTED,
                sync_status: SyncStatus.ERROR,
              },
              ingestionStatus: IngestionStatus.SYNC_ERROR,
            },
          ],
          isLoading: false,
          meta: DEFAULT_META,
          status: Status.SUCCESS,
        });
      });
    });
  });
});
