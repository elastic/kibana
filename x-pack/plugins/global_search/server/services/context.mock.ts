/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { Capabilities } from 'src/core/server';
import {
  savedObjectsTypeRegistryMock,
  savedObjectsClientMock,
  elasticsearchServiceMock,
  uiSettingsServiceMock,
  capabilitiesServiceMock,
} from '../../../../../src/core/server/mocks';

const createContextMock = (capabilities: Partial<Capabilities> = {}) => {
  return {
    core: {
      savedObjects: {
        client: savedObjectsClientMock.create(),
        typeRegistry: savedObjectsTypeRegistryMock.create(),
      },
      elasticsearch: {
        legacy: {
          client: elasticsearchServiceMock.createLegacyScopedClusterClient(),
        },
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
