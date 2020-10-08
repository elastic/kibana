/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectProviderRegistry } from './saved_object_provider_registry';

const createSavedObjectProviderRegistryMock = () => {
  return ({
    registerProvider: jest.fn(),
    registerDefaultProvider: jest.fn(),
    getProvidersClient: jest.fn(),
  } as unknown) as jest.Mocked<SavedObjectProviderRegistry>;
};

export const savedObjectProviderRegistryMock = {
  create: createSavedObjectProviderRegistryMock,
};
