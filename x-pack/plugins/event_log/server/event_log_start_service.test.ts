/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'src/core/server';
import { savedObjectsClientMock } from 'src/core/server/mocks';

import { EventLogClientService } from './event_log_start_service';
import { contextMock } from './es/context.mock';
import { savedObjectProviderRegistryMock } from './saved_object_provider_registry.mock';

jest.mock('./event_log_client');

describe('EventLogClientService', () => {
  const esContext = contextMock.create();

  describe('getClient', () => {
    test('creates a client with a scoped SavedObjects client', () => {
      const savedObjectProviderRegistry = savedObjectProviderRegistryMock.create();
      const request = fakeRequest();

      const eventLogStartService = new EventLogClientService({
        esContext,
        savedObjectProviderRegistry,
      });

      eventLogStartService.getClient(request);

      expect(savedObjectProviderRegistry.getProvidersClient).toHaveBeenCalledWith(request);
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
