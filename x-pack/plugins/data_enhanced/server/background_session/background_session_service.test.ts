/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { coreMock } from 'src/core/server/mocks';
import { BackgroundSessionService } from './background_session_service';
import { securityMock } from '../../../security/server/mocks';
import {
  BACKGROUND_SESSION_STORE_DAYS,
  BackgroundSessionStatus,
} from '../../common/background_session';
import { BACKGROUND_SESSION_TYPE } from './saved_object';
import { KibanaRequest, SavedObjectsClient } from 'kibana/server';

describe('Background session service', () => {
  const mockCoreStart = coreMock.createStart();
  const loggingMock = {
    debug: () => {},
  } as any;
  const securityMockSetup = securityMock.createSetup();
  const updateExpirationMock = jest.fn();
  const mockApiCaller = jest.fn();
  const RealDate = Date.now;
  const MOCK_CREATION_DATE = '1985-06-22T10:20:30.000Z';
  const MOCK_SESSION_ID = 'session-id-mock';
  const MOCK_USER_EMAIL = 'so@awesome.com';
  const MOCK_ASYNC_ID = '123456';
  const MOCK_REQUEST_PARAMS = {
    a: 1,
    b: 2,
  };
  const MOCK_KEY_HASH = '30edf736e498037598b1d4e7151f3d01';
  let bgService: BackgroundSessionService;

  const mockScopedClient = () => {
    const mockRequest = {} as KibanaRequest;
    return mockCoreStart.savedObjects.getScopedClient(mockRequest) as jest.Mocked<
      SavedObjectsClient
    >;
  };

  const createMockIdMapping = (
    mapValues: any[],
    insertTime?: moment.Moment,
    retryCount?: number
  ) => {
    const fakeMap = new Map();
    fakeMap.set(MOCK_SESSION_ID, {
      userId: MOCK_USER_EMAIL,
      requests: new Map(mapValues),
      insertTime: insertTime || moment(),
      retryCount: retryCount || 0,
    });
    return fakeMap;
  };

  const createMockInternalSavedObjectClient = (
    updateSpy?: jest.SpyInstance<any>,
    bulkGetSpy?: jest.SpyInstance<any>
  ) => {
    Object.defineProperty(bgService, 'internalSavedObjectsClient', {
      get: () => {
        const bulkGet =
          bulkGetSpy ||
          (() => {
            return {
              saved_objects: [
                {
                  attributes: {
                    sessionId: MOCK_SESSION_ID,
                    idMapping: {
                      'another-key': 'another-async-id',
                    },
                  },
                  id: MOCK_SESSION_ID,
                  version: '1',
                },
              ],
            };
          });

        const update = updateSpy || (() => {});
        return {
          bulkGet,
          update,
        };
      },
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockApiCaller.mockClear();
    bgService = new BackgroundSessionService(
      mockCoreStart.savedObjects,
      securityMockSetup,
      updateExpirationMock,
      loggingMock
    );
    securityMockSetup.authc.getCurrentUser.mockReturnValue({
      email: MOCK_USER_EMAIL,
    } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    bgService.destroy();
    securityMockSetup.authc.getCurrentUser.mockClear();
  });

  describe('Monitor', () => {
    beforeEach(() => {});

    it('should do nothing when no IDs are mapped', async () => {
      const bulkGetSpy = jest
        .spyOn(mockScopedClient(), 'bulkGet')
        .mockResolvedValueOnce(undefined as any);
      createMockInternalSavedObjectClient(undefined, bulkGetSpy);
      jest.advanceTimersByTime(10000);
      expect(bulkGetSpy).not.toHaveBeenCalled();
    });

    it('should try to fetch saved objects if some ids are mapped', async () => {
      const mockIdMapping = createMockIdMapping([[MOCK_KEY_HASH, MOCK_ASYNC_ID]]);
      Object.defineProperty(bgService, 'idMapping', {
        get: () => mockIdMapping,
      });

      const bulkGetSpy = jest
        .spyOn(mockScopedClient(), 'bulkGet')
        .mockResolvedValueOnce(undefined as any);
      createMockInternalSavedObjectClient(undefined, bulkGetSpy);

      jest.advanceTimersByTime(10000);
      expect(bulkGetSpy).toHaveBeenCalledTimes(1);
    });

    it('should expire IDs', async (cb) => {
      mockScopedClient().bulkGet.mockResolvedValueOnce(undefined as any);
      const mockIdMapping = createMockIdMapping(
        [[MOCK_KEY_HASH, MOCK_ASYNC_ID]],
        moment().subtract(1, 'm')
      );
      const deleteSpy = jest.spyOn(mockIdMapping, 'delete');
      Object.defineProperty(bgService, 'idMapping', {
        get: () => mockIdMapping,
      });

      // Get setInterval to fire
      jest.advanceTimersByTime(10000);

      // Release timers to call check after test actions are done.
      jest.useRealTimers();
      setTimeout(() => {
        expect(deleteSpy).toHaveBeenCalledTimes(1);
        cb();
      }, 100);
    });

    it('should update saved object ids and clear them', async (cb) => {
      // Mock internalSavedObjectsClient
      const updateSpy = jest.fn().mockResolvedValue(true);
      createMockInternalSavedObjectClient(updateSpy);

      // Setup in memory id mapping
      const mockIdMapping = createMockIdMapping([[MOCK_KEY_HASH, MOCK_ASYNC_ID]]);
      const deleteSpy = jest.spyOn(mockIdMapping, 'delete');
      Object.defineProperty(bgService, 'idMapping', {
        get: () => mockIdMapping,
      });

      // Get setInterval to fire
      jest.advanceTimersByTime(10000);

      // Release timers to call check after test actions are done.
      jest.useRealTimers();
      setTimeout(() => {
        expect(updateSpy).toHaveBeenCalledTimes(1);
        expect(deleteSpy).toHaveBeenCalledTimes(1);
        cb();
      }, 100);
    });

    it('should keep ids in mem in case of update failure', async (cb) => {
      // Mock internalSavedObjectsClient
      const updateSpy = jest.fn().mockResolvedValue(false);
      createMockInternalSavedObjectClient(updateSpy);

      // Setup in memory id mapping
      const mockIdMapping = createMockIdMapping([[MOCK_KEY_HASH, MOCK_ASYNC_ID]]);
      const deleteSpy = jest.spyOn(mockIdMapping, 'delete');
      Object.defineProperty(bgService, 'idMapping', {
        get: () => mockIdMapping,
      });

      // Get setInterval to fire
      jest.advanceTimersByTime(10000);

      // Release timers to call check after test actions are done.
      jest.useRealTimers();
      setTimeout(() => {
        expect(updateSpy).toHaveBeenCalledTimes(1);
        expect(deleteSpy).toHaveBeenCalledTimes(0);
        cb();
      }, 100);
    });

    it('should give up on id if update retries exceeded', async (cb) => {
      // Mock internalSavedObjectsClient
      const updateSpy = jest.fn().mockResolvedValue(false);
      createMockInternalSavedObjectClient(updateSpy);

      // Setup in memory id mapping
      const mockIdMapping = createMockIdMapping([[MOCK_KEY_HASH, MOCK_ASYNC_ID]], undefined, 3);
      const deleteSpy = jest.spyOn(mockIdMapping, 'delete');
      Object.defineProperty(bgService, 'idMapping', {
        get: () => mockIdMapping,
      });

      // Get setInterval to fire
      jest.advanceTimersByTime(10000);

      // Release timers to call check after test actions are done.
      jest.useRealTimers();
      setTimeout(() => {
        expect(updateSpy).toHaveBeenCalledTimes(0);
        expect(deleteSpy).toHaveBeenCalledTimes(1);
        cb();
      }, 100);
    });
  });

  describe('Store', () => {
    beforeAll(() => {
      global.Date.now = jest.fn(() => new Date(MOCK_CREATION_DATE).getTime());
    });

    afterAll(() => {
      global.Date.now = RealDate;
    });

    it('Creates a saved object', async () => {
      const expectedSoStructure = {
        creation: MOCK_CREATION_DATE,
        expiration: moment(MOCK_CREATION_DATE)
          .add(BACKGROUND_SESSION_STORE_DAYS, 'd')
          .toISOString(),
        idMapping: {},
        sessionId: MOCK_SESSION_ID,
        status: BackgroundSessionStatus.Running,
      };
      const expectedSoOptions = {
        id: MOCK_SESSION_ID,
        overwrite: false,
      };
      const mockRequest = {} as KibanaRequest;
      await bgService.store(mockRequest, MOCK_SESSION_ID);
      expect(mockScopedClient().create).toHaveBeenCalledWith(
        BACKGROUND_SESSION_TYPE,
        expectedSoStructure,
        expectedSoOptions
      );
    });
  });

  describe('Track', () => {
    beforeAll(() => {
      global.Date.now = jest.fn(() => new Date(MOCK_CREATION_DATE).getTime());
    });

    afterAll(() => {
      global.Date.now = RealDate;
    });

    it('Fails quietly when no user is available', async () => {
      securityMockSetup.authc.getCurrentUser.mockReturnValue(null);
      const mockSet = jest.fn();
      const mockRequest = {} as KibanaRequest;
      const mockIdMapping = {
        get: () => {
          return {
            get: () => false,
            set: mockSet,
          };
        },
      };
      Object.defineProperty(bgService, 'idMapping', mockIdMapping);
      bgService.trackId(mockRequest, MOCK_SESSION_ID, MOCK_REQUEST_PARAMS, MOCK_ASYNC_ID);
      expect(mockSet).toBeCalledTimes(0);
    });

    it('Tracks a new session and ID', async () => {
      const mockSet = jest.fn();
      const mockRequest = {} as KibanaRequest;
      const mockIdMapping = {
        get: () => {
          return {
            get: () => false,
            set: mockSet,
          };
        },
      };
      Object.defineProperty(bgService, 'idMapping', mockIdMapping);
      bgService.trackId(mockRequest, MOCK_SESSION_ID, MOCK_REQUEST_PARAMS, MOCK_ASYNC_ID);

      const calledKey = mockSet.mock.calls[0][0];
      const calledSession = mockSet.mock.calls[0][1];

      expect(calledKey).toEqual(MOCK_SESSION_ID);
      expect(calledSession.insertTime.toISOString()).toEqual(MOCK_CREATION_DATE);
      expect(calledSession.userId).toEqual(MOCK_USER_EMAIL);
      expect(calledSession.requests.get(MOCK_KEY_HASH)).toEqual(MOCK_ASYNC_ID);
    });

    it('Tracks an existing session and a new ID', async () => {
      const mockSet = jest.fn();
      const mockRequest = {} as KibanaRequest;
      const mockIdMapping = {
        get: () => {
          return {
            get: () => {
              const fakeRequests = new Map();
              fakeRequests.set('another-key', 'another-async-id');
              return {
                userId: MOCK_USER_EMAIL,
                requests: fakeRequests,
                insertTime: moment(),
              };
            },
            set: mockSet,
          };
        },
      };
      Object.defineProperty(bgService, 'idMapping', mockIdMapping);
      bgService.trackId(mockRequest, MOCK_SESSION_ID, MOCK_REQUEST_PARAMS, MOCK_ASYNC_ID);

      const calledKey = mockSet.mock.calls[0][0];
      const calledSession = mockSet.mock.calls[0][1];

      // Make sure requests are merged into the same object.
      expect(calledKey).toEqual(MOCK_SESSION_ID);
      expect(calledSession.insertTime.toISOString()).toEqual(MOCK_CREATION_DATE);
      expect(calledSession.userId).toEqual(MOCK_USER_EMAIL);
      expect(calledSession.requests.get(MOCK_KEY_HASH)).toEqual(MOCK_ASYNC_ID);
      expect(calledSession.requests.get('another-key')).toEqual('another-async-id');
    });
  });

  describe('Get Id', () => {
    it('Returns undefined when no user is available', async () => {
      const mockRequest = {} as KibanaRequest;
      securityMockSetup.authc.getCurrentUser.mockReturnValue(null);
      const id = await bgService.getId(mockRequest, MOCK_SESSION_ID, MOCK_REQUEST_PARAMS);
      expect(id).toBe(undefined);
    });

    it('Returns undefined when object not found', async () => {
      const mockRequest = {} as KibanaRequest;
      mockScopedClient().get.mockResolvedValueOnce(undefined as any);
      const id = await bgService.getId(mockRequest, MOCK_SESSION_ID, MOCK_REQUEST_PARAMS);
      expect(id).toBe(undefined);
    });

    it('Returns undefined when key is not in object', async () => {
      const mockRequest = {} as KibanaRequest;
      mockScopedClient().get.mockResolvedValueOnce({
        attributes: {
          idMapping: {
            'another-key': 'another-async-id',
          },
        },
      } as any);
      const id = await bgService.getId(mockRequest, MOCK_SESSION_ID, MOCK_REQUEST_PARAMS);
      expect(id).toBe(undefined);
    });

    it('Returns key from object', async () => {
      const mockRequest = {} as KibanaRequest;
      mockScopedClient().get.mockResolvedValueOnce({
        attributes: {
          idMapping: {
            [MOCK_KEY_HASH]: MOCK_ASYNC_ID,
          },
        },
      } as any);
      const id = await bgService.getId(mockRequest, MOCK_SESSION_ID, MOCK_REQUEST_PARAMS);
      expect(id).toBe(MOCK_ASYNC_ID);
    });
  });
});
