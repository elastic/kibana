/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaResponseFactory } from 'kibana/server';

import { xpackMocks } from '../../../../../../mocks';
import { loggingSystemMock, httpServerMock } from '../../../../../../../src/core/server/mocks';
import { ExceptionListItemSchema } from '../../../../../lists/common/schemas/response';
import { listMock } from '../../../../../lists/server/mocks';
import { ExceptionListClient } from '../../../../../lists/server';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';

import { ConditionEntryField, OperatingSystem } from '../../../../common/endpoint/types';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { createConditionEntry, createEntryMatch } from './mapping';
import {
  getTrustedAppsCreateRouteHandler,
  getTrustedAppsDeleteRouteHandler,
  getTrustedAppsListRouteHandler,
} from './handlers';

const exceptionsListClient = listMock.getExceptionListClient() as jest.Mocked<ExceptionListClient>;

const createAppContextMock = () => ({
  logFactory: loggingSystemMock.create(),
  service: new EndpointAppContextService(),
  config: () => Promise.resolve(createMockConfig()),
});

const createHandlerContextMock = () => ({
  ...xpackMocks.createRequestHandlerContext(),
  lists: {
    getListClient: jest.fn(),
    getExceptionListClient: jest.fn().mockReturnValue(exceptionsListClient),
  },
});

const assertResponse = <T>(
  response: jest.Mocked<KibanaResponseFactory>,
  expectedResponseType: keyof KibanaResponseFactory,
  expectedResponseBody: T
) => {
  expect(response[expectedResponseType]).toBeCalled();
  expect(response[expectedResponseType].mock.calls[0][0]?.body).toEqual(expectedResponseBody);
};

const EXCEPTION_LIST_ITEM: ExceptionListItemSchema = {
  _version: '123',
  id: '123',
  comments: [],
  created_at: '11/11/2011T11:11:11.111',
  created_by: 'admin',
  description: 'Linux trusted app 1',
  entries: [
    createEntryMatch('process.executable.caseless', '/bin/malware'),
    createEntryMatch('process.hash.md5', '1234234659af249ddf3e40864e9fb241'),
  ],
  item_id: '123',
  list_id: 'endpoint_trusted_apps',
  meta: undefined,
  name: 'linux trusted app 1',
  namespace_type: 'agnostic',
  os_types: ['linux'],
  tags: [],
  type: 'simple',
  tie_breaker_id: '123',
  updated_at: '11/11/2011T11:11:11.111',
  updated_by: 'admin',
};

const NEW_TRUSTED_APP = {
  name: 'linux trusted app 1',
  description: 'Linux trusted app 1',
  os: OperatingSystem.LINUX,
  entries: [
    createConditionEntry(ConditionEntryField.PATH, '/bin/malware'),
    createConditionEntry(ConditionEntryField.HASH, '1234234659af249ddf3e40864e9fb241'),
  ],
};

const TRUSTED_APP = {
  id: '123',
  created_at: '11/11/2011T11:11:11.111',
  created_by: 'admin',
  name: 'linux trusted app 1',
  description: 'Linux trusted app 1',
  os: OperatingSystem.LINUX,
  entries: [
    createConditionEntry(ConditionEntryField.HASH, '1234234659af249ddf3e40864e9fb241'),
    createConditionEntry(ConditionEntryField.PATH, '/bin/malware'),
  ],
};

describe('handlers', () => {
  const appContextMock = createAppContextMock();

  beforeEach(() => {
    exceptionsListClient.deleteExceptionListItem.mockReset();
    exceptionsListClient.createExceptionListItem.mockReset();
    exceptionsListClient.findExceptionListItem.mockReset();
    exceptionsListClient.createTrustedAppsList.mockReset();

    appContextMock.logFactory.get.mockClear();
    (appContextMock.logFactory.get().error as jest.Mock).mockClear();
  });

  describe('getTrustedAppsDeleteRouteHandler', () => {
    const deleteTrustedAppHandler = getTrustedAppsDeleteRouteHandler(appContextMock);

    it('should return ok when trusted app deleted', async () => {
      const mockResponse = httpServerMock.createResponseFactory();

      exceptionsListClient.deleteExceptionListItem.mockResolvedValue(EXCEPTION_LIST_ITEM);

      await deleteTrustedAppHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ params: { id: '123' } }),
        mockResponse
      );

      assertResponse(mockResponse, 'ok', undefined);
    });

    it('should return notFound when trusted app missing', async () => {
      const mockResponse = httpServerMock.createResponseFactory();

      await deleteTrustedAppHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ params: { id: '123' } }),
        mockResponse
      );

      assertResponse(mockResponse, 'notFound', 'trusted app id [123] not found');
    });

    it('should return internalError when errors happen', async () => {
      const mockResponse = httpServerMock.createResponseFactory();
      const error = new Error('Something went wrong');

      exceptionsListClient.deleteExceptionListItem.mockRejectedValue(error);

      await deleteTrustedAppHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ params: { id: '123' } }),
        mockResponse
      );

      assertResponse(mockResponse, 'internalError', error);
      expect(appContextMock.logFactory.get('trusted_apps').error).toHaveBeenCalledWith(error);
    });
  });

  describe('getTrustedAppsCreateRouteHandler', () => {
    const createTrustedAppHandler = getTrustedAppsCreateRouteHandler(appContextMock);

    it('should return ok with body when trusted app created', async () => {
      const mockResponse = httpServerMock.createResponseFactory();

      exceptionsListClient.createExceptionListItem.mockResolvedValue(EXCEPTION_LIST_ITEM);

      await createTrustedAppHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ body: NEW_TRUSTED_APP }),
        mockResponse
      );

      assertResponse(mockResponse, 'ok', { data: TRUSTED_APP });
    });

    it('should return internalError when errors happen', async () => {
      const mockResponse = httpServerMock.createResponseFactory();
      const error = new Error('Something went wrong');

      exceptionsListClient.createExceptionListItem.mockRejectedValue(error);

      await createTrustedAppHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ body: NEW_TRUSTED_APP }),
        mockResponse
      );

      assertResponse(mockResponse, 'internalError', error);
      expect(appContextMock.logFactory.get('trusted_apps').error).toHaveBeenCalledWith(error);
    });
  });

  describe('getTrustedAppsListRouteHandler', () => {
    const getTrustedAppsListHandler = getTrustedAppsListRouteHandler(appContextMock);

    it('should return ok with list when no errors', async () => {
      const mockResponse = httpServerMock.createResponseFactory();

      exceptionsListClient.findExceptionListItem.mockResolvedValue({
        data: [EXCEPTION_LIST_ITEM],
        page: 1,
        per_page: 20,
        total: 100,
      });

      await getTrustedAppsListHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ params: { page: 1, per_page: 20 } }),
        mockResponse
      );

      assertResponse(mockResponse, 'ok', {
        data: [TRUSTED_APP],
        page: 1,
        per_page: 20,
        total: 100,
      });
    });

    it('should return internalError when errors happen', async () => {
      const mockResponse = httpServerMock.createResponseFactory();
      const error = new Error('Something went wrong');

      exceptionsListClient.findExceptionListItem.mockRejectedValue(error);

      await getTrustedAppsListHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ body: NEW_TRUSTED_APP }),
        mockResponse
      );

      assertResponse(mockResponse, 'internalError', error);
      expect(appContextMock.logFactory.get('trusted_apps').error).toHaveBeenCalledWith(error);
    });
  });
});
