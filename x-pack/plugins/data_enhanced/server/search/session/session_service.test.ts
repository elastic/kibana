/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { coreMock } from 'src/core/server/mocks';
import { SessionService } from './session_service';
import { securityMock } from '../../../../security/server/mocks';
import { BACKGROUND_SESSION_STORE_DAYS, SavedSessionStatus } from '../../../common';
import { BACKGROUND_SESSION_TYPE } from './saved_object';
import { KibanaRequest, SavedObjectsClient } from 'kibana/server';
import { updateExpiration } from '..';

jest.mock('..');

describe('Session service', () => {
  const mockCoreStart = coreMock.createStart();
  const loggingMock = {
    debug: () => {},
  } as any;
  const securityMockSetup = securityMock.createSetup();
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
  const MOCK_KEY_HASH = '608de49a4600dbb5b173492759792e4a';
  let bgService: SessionService;

  const mockScopedClient = () => {
    const mockRequest = {} as KibanaRequest;
    return mockCoreStart.savedObjects.getScopedClient(mockRequest) as jest.Mocked<
      SavedObjectsClient
    >;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockApiCaller.mockClear();
    bgService = new SessionService(
      mockCoreStart.savedObjects,
      mockCoreStart.elasticsearch,
      securityMockSetup,
      loggingMock
    );
    securityMockSetup.authc.getCurrentUser.mockReturnValue({
      email: MOCK_USER_EMAIL,
    } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    securityMockSetup.authc.getCurrentUser.mockClear();
  });

  describe('Store', () => {
    beforeAll(() => {
      global.Date.now = jest.fn(() => new Date(MOCK_CREATION_DATE).getTime());
    });

    afterAll(() => {
      global.Date.now = RealDate;
    });

    it('Creates a saved object without searchIds', async () => {
      const expectedSoStructure = {
        creation: MOCK_CREATION_DATE,
        expiration: moment(MOCK_CREATION_DATE)
          .add(BACKGROUND_SESSION_STORE_DAYS, 'd')
          .toISOString(),
        idMapping: {},
        sessionId: MOCK_SESSION_ID,
        status: SavedSessionStatus.Running,
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

    it('Creates a saved object with searchIds', async () => {
      const expectedSoStructure = {
        creation: MOCK_CREATION_DATE,
        expiration: moment(MOCK_CREATION_DATE)
          .add(BACKGROUND_SESSION_STORE_DAYS, 'd')
          .toISOString(),
        idMapping: { a: 'b' },
        sessionId: MOCK_SESSION_ID,
        status: SavedSessionStatus.Running,
      };
      const expectedSoOptions = {
        id: MOCK_SESSION_ID,
        overwrite: false,
      };
      const mockRequest = {} as KibanaRequest;
      await bgService.store(mockRequest, MOCK_SESSION_ID, { a: 'b' });
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

    it('Fails quietly when no background session exists', async () => {
      bgService.get = jest.fn().mockResolvedValue(undefined);
      const mockRequest = {} as KibanaRequest;
      const res = await bgService.trackId(
        mockRequest,
        MOCK_SESSION_ID,
        MOCK_REQUEST_PARAMS,
        MOCK_ASYNC_ID
      );
      expect(res).toBe(false);
    });

    it('Tracks an existing session and a new ID', async () => {
      const mockedScopedClient = mockScopedClient();
      mockedScopedClient.update.mockResolvedValue({
        id: MOCK_SESSION_ID,
        type: 'background-session',
        attributes: {},
      } as any);

      (updateExpiration as jest.Mock).mockImplementation(() => true);

      bgService.get = jest.fn().mockReturnValue({
        attributes: {},
        id: MOCK_SESSION_ID,
        version: 2,
      });
      const mockRequest = {} as KibanaRequest;
      const res = await bgService.trackId(
        mockRequest,
        MOCK_SESSION_ID,
        MOCK_REQUEST_PARAMS,
        MOCK_ASYNC_ID
      );

      expect(res).toBe(true);
      expect(updateExpiration).toBeCalledTimes(1);
      expect(mockedScopedClient.update).toHaveBeenCalledWith(
        BACKGROUND_SESSION_TYPE,
        MOCK_SESSION_ID,
        { idMapping: { [MOCK_KEY_HASH]: MOCK_ASYNC_ID } },
        {
          version: 2,
        }
      );
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
