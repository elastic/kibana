/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventLogClientService } from './event_log_start_service';
import { contextMock } from './es/context.mock';
import { KibanaRequest } from 'kibana/server';
import { savedObjectsClientMock, savedObjectsServiceMock } from 'src/core/server/mocks';

jest.mock('./event_log_client');

describe('EventLogClientService', () => {
  const esContext = contextMock.create();

  describe('getClient', () => {
    test('creates a client with a scoped SavedObjects client', () => {
      const savedObjectsService = savedObjectsServiceMock.createStartContract();
      const request = fakeRequest();

      const eventLogStartService = new EventLogClientService({
        esContext,
        savedObjectsService,
      });

      eventLogStartService.getClient(request);

      expect(savedObjectsService.getScopedClient).toHaveBeenCalledWith(request);

      const [{ value: savedObjectsClient }] = savedObjectsService.getScopedClient.mock.results;

      expect(jest.requireMock('./event_log_client').EventLogClient).toHaveBeenCalledWith({
        esContext,
        savedObjectsClient,
      });
    });
  });
});

function fakeRequest(): KibanaRequest {
  const savedObjectsClient = savedObjectsClientMock.create();
  return ({
    headers: {},
    getBasePath: () => '',
    path: '/',
    route: { settings: {} },
    url: {
      href: '/',
    },
    raw: {
      req: {
        url: '/',
      },
    },
    getSavedObjectsClient: () => savedObjectsClient,
  } as unknown) as KibanaRequest;
}
