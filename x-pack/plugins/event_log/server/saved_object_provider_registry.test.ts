/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectProviderRegistry } from './saved_object_provider_registry';
import uuid from 'uuid';
import { KibanaRequest } from 'src/core/server';
import { savedObjectsClientMock, savedObjectsServiceMock } from 'src/core/server/mocks';

describe('SavedObjectProviderRegistry', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('registerProvider()', () => {
    test('should register providers', () => {
      const registry = new SavedObjectProviderRegistry(
        savedObjectsServiceMock.createStartContract()
      );
      registry.registerProvider('alert', jest.fn());
    });

    test('should throw an error if type is already registered', () => {
      const registry = new SavedObjectProviderRegistry(
        savedObjectsServiceMock.createStartContract()
      );
      registry.registerProvider('alert', jest.fn());
      expect(() =>
        registry.registerProvider('alert', jest.fn())
      ).toThrowErrorMatchingInlineSnapshot(
        `"The Event Log has already registered a Provider for the Save Object type \\"alert\\"."`
      );
    });
  });

  describe('getSavedObject()', () => {
    test('should get SavedObject using the registered provider by type', async () => {
      const registry = new SavedObjectProviderRegistry(
        savedObjectsServiceMock.createStartContract()
      );

      const provider = jest.fn();
      registry.registerProvider('alert', provider);

      const request = fakeRequest();
      const alert = {
        id: uuid.v4(),
      };

      provider.mockResolvedValue(alert);

      expect(await registry.getSavedObject(request, 'alert', alert.id)).toMatchObject(alert);

      expect(provider).toHaveBeenCalledWith(request, alert.id);
    });

    test('should get SavedObject using the savedObjectsClient for unregistered types', async () => {
      const savedObjectsService = savedObjectsServiceMock.createStartContract();
      const registry = new SavedObjectProviderRegistry(savedObjectsService);

      const provider = jest.fn();
      registry.registerProvider('alert', provider);

      const request = fakeRequest();
      const action = {
        id: uuid.v4(),
        type: 'action',
        attributes: {},
        references: [],
      };

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.get.mockResolvedValue(action);
      savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);

      expect(await registry.getSavedObject(request, 'action', action.id)).toMatchObject(action);

      expect(savedObjectsClient.get).toHaveBeenCalledWith('action', action.id);
      expect(savedObjectsService.getScopedClient).toHaveBeenCalledWith(request);
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
