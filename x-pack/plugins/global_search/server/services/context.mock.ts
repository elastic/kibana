/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Capabilities } from '@kbn/core/server';
import {
  capabilitiesServiceMock,
  savedObjectsClientMock,
  savedObjectsTypeRegistryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { of } from 'rxjs';

const createContextMock = (capabilities: Partial<Capabilities> = {}) => {
  return {
    core: {
      savedObjects: {
        client: savedObjectsClientMock.create(),
        typeRegistry: savedObjectsTypeRegistryMock.create(),
      },
      uiSettings: {
        client: uiSettingsServiceMock.createClient(),
      },
      capabilities: of({
        ...capabilitiesServiceMock.createCapabilities(),
        ...capabilities,
      } as Capabilities),
    },
  };
};

const createFactoryMock = () => () => () => createContextMock();

export const contextMock = {
  create: createContextMock,
  createFactory: createFactoryMock,
};
