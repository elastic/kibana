/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { HttpServiceSetup } from '@kbn/core/server';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { SavedObjectsClientFactory } from './saved_objects_client_factory';

interface CreateSavedObjectsClientFactoryMockOptions {
  savedObjectsServiceStart: jest.Mocked<SavedObjectsServiceStart>;
  httpServiceSetup: HttpServiceSetup;
}

export const createSavedObjectsClientFactoryMock = (
  dependencies: Partial<CreateSavedObjectsClientFactoryMockOptions> = {}
): {
  service: SavedObjectsClientFactory;
  dependencies: CreateSavedObjectsClientFactoryMockOptions;
} => {
  const {
    savedObjectsServiceStart = savedObjectsServiceMock.createStartContract(),
    httpServiceSetup = coreMock.createSetup().http,
  } = dependencies;
  const service = new SavedObjectsClientFactory(savedObjectsServiceStart, httpServiceSetup);
  const soClient = service.createInternalUnscopedSoClient(false);
  const createInternalScopedSoClientSpy = jest.spyOn(service, 'createInternalScopedSoClient');
  const createInternalUnscopedSoClientSpy = jest.spyOn(service, 'createInternalUnscopedSoClient');

  createInternalScopedSoClientSpy.mockReturnValue(soClient);
  createInternalUnscopedSoClientSpy.mockReturnValue(soClient);

  return {
    service,
    dependencies: { savedObjectsServiceStart, httpServiceSetup },
  };
};
