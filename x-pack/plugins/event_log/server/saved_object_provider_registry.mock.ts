/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectProviderRegistry } from './saved_object_provider_registry';

type Schema = PublicMethodsOf<SavedObjectProviderRegistry>;

const createSavedObjectProviderRegistryMock = () => {
  const mocked: jest.Mocked<Schema> = {
    registerProvider: jest.fn(),
    getSavedObject: jest.fn(),
  };
  return mocked;
};

export const savedObjectProviderRegistryMock = {
  create: createSavedObjectProviderRegistryMock,
};
