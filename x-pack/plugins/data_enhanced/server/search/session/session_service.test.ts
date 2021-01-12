/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject, of } from 'rxjs';
import type { SavedObject, SavedObjectsClientContract } from 'kibana/server';
import type { SearchStrategyDependencies } from '../../../../../../src/plugins/data/server';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { SearchSessionStatus } from '../../../common';
import { SEARCH_SESSION_TYPE } from '../../saved_objects';
import { SearchSessionDependencies, SearchSessionService, SessionInfo } from './session_service';
import { createRequestHash } from './utils';
import moment from 'moment';
import { coreMock } from 'src/core/server/mocks';
import { ConfigSchema } from '../../../config';
// @ts-ignore
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { INMEM_TRACKING_INTERVAL, MAX_UPDATE_RETRIES } from './constants';
import { SearchStatus } from './types';

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('SearchSessionService', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let service: SearchSessionService;

  const MOCK_SESSION_ID = 'session-id-mock';
  const MOCK_ASYNC_ID = '123456';
  const MOCK_STRATEGY = 'ese';
  const MOCK_KEY_HASH = '608de49a4600dbb5b173492759792e4a';

  const createMockInternalSavedObjectClient = (
    findSpy?: jest.SpyInstance<any>,
    bulkUpdateSpy?: jest.SpyInstance<any>
  ) => {
    Object.defineProperty(service, 'internalSavedObjectsClient', {
      get: () => {
        const find =
          findSpy ||
          (() => {
            return {
              saved_objects: [
                {
                  attributes: {
                    sessionId: MOCK_SESSION_ID,
                    idMapping: {
                      'another-key': {
                        id: 'another-async-id',
                        strategy: 'another-strategy',
                      },
                    },
                  },
                  id: MOCK_SESSION_ID,
                  version: '1',
                },
              ],
            };
          });

        const bulkUpdate =
          bulkUpdateSpy ||
          (() => {
            return {
              saved_objects: [],
            };
          });
        return {
          find,
          bulkUpdate,
        };
      },
    });
  };

  const createMockIdMapping = (
    mapValues: any[],
    insertTime?: moment.Moment,
    retryCount?: number
  ): Map<string, SessionInfo> => {
    const fakeMap = new Map();
    fakeMap.set(MOCK_SESSION_ID, {
      ids: new Map(mapValues),
      insertTime: insertTime || moment(),
      retryCount: retryCount || 0,
    });
    return fakeMap;
  };

  const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
  const mockSavedObject: SavedObject = {
    id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
    type: SEARCH_SESSION_TYPE,
    attributes: {
      name: 'my_name',
      appId: 'my_app_id',
      urlGeneratorId: 'my_url_generator_id',
      idMapping: {},
    },
    references: [],
  };

  beforeEach(async () => {
    savedObjectsClient = savedObjectsClientMock.create();
    const mockLogger: any = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    service = new SearchSessionService(mockLogger);
  });

  it('search throws if `name` is not provided', () => {
    expect(() => service.save(sessionId, {}, { savedObjectsClient })).rejects.toMatchInlineSnapshot(
      `[Error: Name is required]`
    );
  });

  it('save throws if `name` is not provided', () => {
    expect(() => service.save(sessionId, {}, { savedObjectsClient })).rejects.toMatchInlineSnapshot(
      `[Error: Name is required]`
    );
  });

  it('get calls saved objects client', async () => {
    savedObjectsClient.get.mockResolvedValue(mockSavedObject);

    const response = await service.get(sessionId, { savedObjectsClient });

    expect(response).toBe(mockSavedObject);
    expect(savedObjectsClient.get).toHaveBeenCalledWith(SEARCH_SESSION_TYPE, sessionId);
  });

  it('find calls saved objects client', async () => {
    const mockFindSavedObject = {
      ...mockSavedObject,
      score: 1,
    };
    const mockResponse = {
      saved_objects: [mockFindSavedObject],
      total: 1,
      per_page: 1,
      page: 0,
    };
    savedObjectsClient.find.mockResolvedValue(mockResponse);

    const options = { page: 0, perPage: 5 };
    const response = await service.find(options, { savedObjectsClient });

    expect(response).toBe(mockResponse);
    expect(savedObjectsClient.find).toHaveBeenCalledWith({
      ...options,
      type: SEARCH_SESSION_TYPE,
    });
  });

  it('update calls saved objects client', async () => {
    const mockUpdateSavedObject = {
      ...mockSavedObject,
      attributes: {},
    };
    savedObjectsClient.update.mockResolvedValue(mockUpdateSavedObject);

    const attributes = { name: 'new_name' };
    const response = await service.update(sessionId, attributes, { savedObjectsClient });

    expect(response).toBe(mockUpdateSavedObject);
    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      SEARCH_SESSION_TYPE,
      sessionId,
      attributes
    );
  });

  it('delete calls saved objects client', async () => {
    savedObjectsClient.delete.mockResolvedValue({});

    const response = await service.delete(sessionId, { savedObjectsClient });

    expect(response).toEqual({});
    expect(savedObjectsClient.delete).toHaveBeenCalledWith(SEARCH_SESSION_TYPE, sessionId);
  });

  describe('search', () => {
    const mockSearch = jest.fn().mockReturnValue(of({}));
    const mockStrategy = { search: mockSearch };
    const mockSearchDeps = {} as SearchStrategyDependencies;
    const mockDeps = {} as SearchSessionDependencies;

    beforeEach(() => {
      mockSearch.mockClear();
    });

    it('searches using the original request if not restoring', async () => {
      const searchRequest = { params: {} };
      const options = { sessionId, isStored: false, isRestore: false };

      await service
        .search(mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
        .toPromise();

      expect(mockSearch).toBeCalledWith(searchRequest, options, mockSearchDeps);
    });

    it('searches using the original request if `id` is provided', async () => {
      const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
      const searchRequest = { id: searchId, params: {} };
      const options = { sessionId, isStored: true, isRestore: true };

      await service
        .search(mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
        .toPromise();

      expect(mockSearch).toBeCalledWith(searchRequest, options, mockSearchDeps);
    });

    it('searches by looking up an `id` if restoring and `id` is not provided', async () => {
      const searchRequest = { params: {} };
      const options = { sessionId, isStored: true, isRestore: true };
      const spyGetId = jest.spyOn(service, 'getId').mockResolvedValueOnce('my_id');

      await service
        .search(mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
        .toPromise();

      expect(mockSearch).toBeCalledWith({ ...searchRequest, id: 'my_id' }, options, mockSearchDeps);

      spyGetId.mockRestore();
    });

    it('calls `trackId` once if the response contains an `id` and not restoring', async () => {
      const searchRequest = { params: {} };
      const options = { sessionId, isStored: false, isRestore: false };
      const spyTrackId = jest.spyOn(service, 'trackId').mockResolvedValue();
      mockSearch.mockReturnValueOnce(of({ id: 'my_id' }, { id: 'my_id' }));

      await service
        .search(mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
        .toPromise();

      expect(spyTrackId).toBeCalledTimes(1);
      expect(spyTrackId).toBeCalledWith(searchRequest, 'my_id', options, {});

      spyTrackId.mockRestore();
    });

    it('does not call `trackId` if restoring', async () => {
      const searchRequest = { params: {} };
      const options = { sessionId, isStored: true, isRestore: true };
      const spyGetId = jest.spyOn(service, 'getId').mockResolvedValueOnce('my_id');
      const spyTrackId = jest.spyOn(service, 'trackId').mockResolvedValue();
      mockSearch.mockReturnValueOnce(of({ id: 'my_id' }));

      await service
        .search(mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
        .toPromise();

      expect(spyTrackId).not.toBeCalled();

      spyGetId.mockRestore();
      spyTrackId.mockRestore();
    });
  });

  describe('trackId', () => {
    it('stores hash in memory when `isStored` is `false` for when `save` is called', async () => {
      const searchRequest = { params: {} };
      const requestHash = createRequestHash(searchRequest.params);
      const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
      const isStored = false;
      const name = 'my saved background search session';
      const appId = 'my_app_id';
      const urlGeneratorId = 'my_url_generator_id';
      const created = new Date().toISOString();
      const expires = new Date().toISOString();

      const mockIdMapping = createMockIdMapping([]);
      const setSpy = jest.fn();
      mockIdMapping.set = setSpy;
      Object.defineProperty(service, 'sessionSearchMap', {
        get: () => mockIdMapping,
      });

      await service.trackId(
        searchRequest,
        searchId,
        { sessionId, isStored, strategy: MOCK_STRATEGY },
        { savedObjectsClient }
      );

      expect(savedObjectsClient.update).not.toHaveBeenCalled();

      await service.save(
        sessionId,
        { name, created, expires, appId, urlGeneratorId },
        { savedObjectsClient }
      );

      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        SEARCH_SESSION_TYPE,
        {
          name,
          created,
          expires,
          initialState: {},
          restoreState: {},
          status: SearchSessionStatus.IN_PROGRESS,
          idMapping: {},
          appId,
          urlGeneratorId,
          sessionId,
        },
        { id: sessionId }
      );

      const [setSessionId, setParams] = setSpy.mock.calls[0];
      expect(setParams.ids.get(requestHash).id).toBe(searchId);
      expect(setParams.ids.get(requestHash).strategy).toBe(MOCK_STRATEGY);
      expect(setSessionId).toBe(sessionId);
    });

    it('updates saved object when `isStored` is `true`', async () => {
      const searchRequest = { params: {} };
      const requestHash = createRequestHash(searchRequest.params);
      const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
      const isStored = true;

      await service.trackId(
        searchRequest,
        searchId,
        { sessionId, isStored, strategy: MOCK_STRATEGY },
        { savedObjectsClient }
      );

      expect(savedObjectsClient.update).toHaveBeenCalledWith(SEARCH_SESSION_TYPE, sessionId, {
        idMapping: {
          [requestHash]: {
            id: searchId,
            strategy: MOCK_STRATEGY,
            status: SearchStatus.IN_PROGRESS,
          },
        },
      });
    });
  });

  describe('getId', () => {
    it('throws if `sessionId` is not provided', () => {
      const searchRequest = { params: {} };

      expect(() =>
        service.getId(searchRequest, {}, { savedObjectsClient })
      ).rejects.toMatchInlineSnapshot(`[Error: Session ID is required]`);
    });

    it('throws if there is not a saved object', () => {
      const searchRequest = { params: {} };

      expect(() =>
        service.getId(searchRequest, { sessionId, isStored: false }, { savedObjectsClient })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Cannot get search ID from a session that is not stored]`
      );
    });

    it('throws if not restoring a saved session', () => {
      const searchRequest = { params: {} };

      expect(() =>
        service.getId(
          searchRequest,
          { sessionId, isStored: true, isRestore: false },
          { savedObjectsClient }
        )
      ).rejects.toMatchInlineSnapshot(
        `[Error: Get search ID is only supported when restoring a session]`
      );
    });

    it('returns the search ID from the saved object ID mapping', async () => {
      const searchRequest = { params: {} };
      const requestHash = createRequestHash(searchRequest.params);
      const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
      const mockSession = {
        id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
        type: SEARCH_SESSION_TYPE,
        attributes: {
          name: 'my_name',
          appId: 'my_app_id',
          urlGeneratorId: 'my_url_generator_id',
          idMapping: {
            [requestHash]: {
              id: searchId,
              strategy: MOCK_STRATEGY,
            },
          },
        },
        references: [],
      };
      savedObjectsClient.get.mockResolvedValue(mockSession);

      const id = await service.getId(
        searchRequest,
        { sessionId, isStored: true, isRestore: true },
        { savedObjectsClient }
      );

      expect(id).toBe(searchId);
    });
  });

  describe('Monitor', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      const config$ = new BehaviorSubject<ConfigSchema>({
        search: {
          sendToBackground: {
            enabled: true,
          },
        },
      });
      const mockTaskManager = taskManagerMock.createStart();
      await service.start(coreMock.createStart(), {
        config$,
        taskManager: mockTaskManager,
      });
      await flushPromises();
    });

    afterEach(() => {
      jest.useRealTimers();
      service.stop();
    });

    it('schedules the next iteration', async () => {
      const findSpy = jest.fn().mockResolvedValue({ saved_objects: [] });
      createMockInternalSavedObjectClient(findSpy);

      const mockIdMapping = createMockIdMapping(
        [[MOCK_KEY_HASH, { id: MOCK_ASYNC_ID, strategy: MOCK_STRATEGY }]],
        moment()
      );

      Object.defineProperty(service, 'sessionSearchMap', {
        get: () => mockIdMapping,
      });

      jest.advanceTimersByTime(INMEM_TRACKING_INTERVAL);
      expect(findSpy).toHaveBeenCalledTimes(1);
      await flushPromises();

      jest.advanceTimersByTime(INMEM_TRACKING_INTERVAL);
      expect(findSpy).toHaveBeenCalledTimes(2);
    });

    it('should delete expired IDs', async () => {
      const findSpy = jest.fn().mockResolvedValueOnce({ saved_objects: [] });
      createMockInternalSavedObjectClient(findSpy);

      const mockIdMapping = createMockIdMapping(
        [[MOCK_KEY_HASH, { id: MOCK_ASYNC_ID, strategy: MOCK_STRATEGY }]],
        moment().subtract(2, 'm')
      );

      const deleteSpy = jest.spyOn(mockIdMapping, 'delete');
      Object.defineProperty(service, 'sessionSearchMap', {
        get: () => mockIdMapping,
      });

      // Get setInterval to fire
      jest.advanceTimersByTime(INMEM_TRACKING_INTERVAL);

      expect(findSpy).not.toHaveBeenCalled();
      expect(deleteSpy).toHaveBeenCalledTimes(1);
    });

    it('should delete IDs that passed max retries', async () => {
      const findSpy = jest.fn().mockResolvedValueOnce({ saved_objects: [] });
      createMockInternalSavedObjectClient(findSpy);

      const mockIdMapping = createMockIdMapping(
        [[MOCK_KEY_HASH, { id: MOCK_ASYNC_ID, strategy: MOCK_STRATEGY }]],
        moment(),
        MAX_UPDATE_RETRIES
      );

      const deleteSpy = jest.spyOn(mockIdMapping, 'delete');
      Object.defineProperty(service, 'sessionSearchMap', {
        get: () => mockIdMapping,
      });

      // Get setInterval to fire
      jest.advanceTimersByTime(INMEM_TRACKING_INTERVAL);

      expect(findSpy).not.toHaveBeenCalled();
      expect(deleteSpy).toHaveBeenCalledTimes(1);
    });

    it('should not fetch when no IDs are mapped', async () => {
      const findSpy = jest.fn().mockResolvedValueOnce({ saved_objects: [] });
      createMockInternalSavedObjectClient(findSpy);

      jest.advanceTimersByTime(INMEM_TRACKING_INTERVAL);
      expect(findSpy).not.toHaveBeenCalled();
    });

    it('should try to fetch saved objects if some ids are mapped', async () => {
      const mockIdMapping = createMockIdMapping([[MOCK_KEY_HASH, MOCK_ASYNC_ID]]);
      Object.defineProperty(service, 'sessionSearchMap', {
        get: () => mockIdMapping,
      });

      const findSpy = jest.fn().mockResolvedValueOnce({ saved_objects: [] });
      const bulkUpdateSpy = jest.fn().mockResolvedValueOnce({ saved_objects: [] });
      createMockInternalSavedObjectClient(findSpy, bulkUpdateSpy);

      jest.advanceTimersByTime(INMEM_TRACKING_INTERVAL);
      expect(findSpy).toHaveBeenCalledTimes(1);
      expect(bulkUpdateSpy).not.toHaveBeenCalled();
    });

    it('should update saved objects if they are found, and delete session on success', async () => {
      const mockIdMapping = createMockIdMapping([[MOCK_KEY_HASH, MOCK_ASYNC_ID]], undefined, 1);
      const mockMapDeleteSpy = jest.fn();
      const mockSessionDeleteSpy = jest.fn();
      mockIdMapping.delete = mockMapDeleteSpy;
      mockIdMapping.get(MOCK_SESSION_ID)!.ids.delete = mockSessionDeleteSpy;
      Object.defineProperty(service, 'sessionSearchMap', {
        get: () => mockIdMapping,
      });

      const findSpy = jest.fn().mockResolvedValueOnce({
        saved_objects: [
          {
            id: MOCK_SESSION_ID,
            attributes: {
              idMapping: {
                b: 'c',
              },
            },
          },
        ],
      });
      const bulkUpdateSpy = jest.fn().mockResolvedValueOnce({
        saved_objects: [
          {
            id: MOCK_SESSION_ID,
            attributes: {
              idMapping: {
                b: 'c',
                [MOCK_KEY_HASH]: {
                  id: MOCK_ASYNC_ID,
                  strategy: MOCK_STRATEGY,
                },
              },
            },
          },
        ],
      });
      createMockInternalSavedObjectClient(findSpy, bulkUpdateSpy);

      jest.advanceTimersByTime(INMEM_TRACKING_INTERVAL);

      // Release timers to call check after test actions are done.
      jest.useRealTimers();
      await new Promise((r) => setTimeout(r, 15));

      expect(findSpy).toHaveBeenCalledTimes(1);
      expect(bulkUpdateSpy).toHaveBeenCalledTimes(1);
      expect(mockSessionDeleteSpy).toHaveBeenCalledTimes(2);
      expect(mockSessionDeleteSpy).toBeCalledWith('b');
      expect(mockSessionDeleteSpy).toBeCalledWith(MOCK_KEY_HASH);
      expect(mockMapDeleteSpy).toBeCalledTimes(1);
    });

    it('should update saved objects if they are found, and increase retryCount on error', async () => {
      const mockIdMapping = createMockIdMapping([[MOCK_KEY_HASH, MOCK_ASYNC_ID]]);
      const mockMapDeleteSpy = jest.fn();
      const mockSessionDeleteSpy = jest.fn();
      mockIdMapping.delete = mockMapDeleteSpy;
      mockIdMapping.get(MOCK_SESSION_ID)!.ids.delete = mockSessionDeleteSpy;
      Object.defineProperty(service, 'sessionSearchMap', {
        get: () => mockIdMapping,
      });

      const findSpy = jest.fn().mockResolvedValueOnce({
        saved_objects: [
          {
            id: MOCK_SESSION_ID,
            attributes: {
              idMapping: {
                b: {
                  id: 'c',
                  strategy: MOCK_STRATEGY,
                },
              },
            },
          },
        ],
      });
      const bulkUpdateSpy = jest.fn().mockResolvedValueOnce({
        saved_objects: [
          {
            id: MOCK_SESSION_ID,
            error: 'not ok',
          },
        ],
      });
      createMockInternalSavedObjectClient(findSpy, bulkUpdateSpy);

      jest.advanceTimersByTime(INMEM_TRACKING_INTERVAL);

      // Release timers to call check after test actions are done.
      jest.useRealTimers();
      await new Promise((r) => setTimeout(r, 15));

      expect(findSpy).toHaveBeenCalledTimes(1);
      expect(bulkUpdateSpy).toHaveBeenCalledTimes(1);
      expect(mockSessionDeleteSpy).not.toHaveBeenCalled();
      expect(mockMapDeleteSpy).not.toHaveBeenCalled();
      expect(mockIdMapping.get(MOCK_SESSION_ID)!.retryCount).toBe(1);
    });
  });
});
