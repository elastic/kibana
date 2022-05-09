/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectProviderRegistry } from './saved_object_provider_registry';
import uuid from 'uuid';
import { KibanaRequest } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

describe('SavedObjectProviderRegistry', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('registerProvider()', () => {
    test('should register providers', () => {
      const registry = new SavedObjectProviderRegistry();
      registry.registerProvider('alert', jest.fn());
    });

    test('should throw an error if type is already registered', () => {
      const registry = new SavedObjectProviderRegistry();
      registry.registerProvider('alert', jest.fn());
      expect(() =>
        registry.registerProvider('alert', jest.fn())
      ).toThrowErrorMatchingInlineSnapshot(
        `"The Event Log has already registered a Provider for the Save Object type \\"alert\\"."`
      );
    });
  });

  describe('getProvidersClient()', () => {
    test('should get SavedObject using the registered provider by type', async () => {
      const registry = new SavedObjectProviderRegistry();
      registry.registerDefaultProvider(jest.fn());

      const getter = jest.fn();
      const provider = jest.fn().mockReturnValue(getter);
      registry.registerProvider('alert', provider);

      const request = fakeRequest();
      const alert = {
        id: uuid.v4(),
      };

      getter.mockResolvedValue(alert);

      expect(await registry.getProvidersClient(request)('alert', [alert.id])).toMatchObject(alert);

      expect(provider).toHaveBeenCalledWith(request);
      expect(getter).toHaveBeenCalledWith([{ id: alert.id, type: 'alert' }]);
    });

    test('should get SavedObject using the default provider for unregistered types', async () => {
      const registry = new SavedObjectProviderRegistry();
      const defaultProvider = jest.fn();
      registry.registerDefaultProvider(defaultProvider);

      registry.registerProvider('alert', jest.fn().mockReturnValue(jest.fn()));

      const request = fakeRequest();
      const action = {
        id: uuid.v4(),
        type: 'action',
        attributes: {},
        references: [],
      };

      const getter = jest.fn();
      defaultProvider.mockReturnValue(getter);
      getter.mockResolvedValue(action);

      expect(await registry.getProvidersClient(request)('action', [action.id])).toMatchObject(
        action
      );

      expect(getter).toHaveBeenCalledWith([{ id: action.id, type: 'action' }]);
      expect(defaultProvider).toHaveBeenCalledWith(request);
    });
  });
});

function fakeRequest(): KibanaRequest {
  const savedObjectsClient = savedObjectsClientMock.create();
  return {
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
  } as unknown as KibanaRequest;
}
