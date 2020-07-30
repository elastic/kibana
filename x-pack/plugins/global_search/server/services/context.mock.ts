/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  savedObjectsTypeRegistryMock,
  savedObjectsClientMock,
  elasticsearchServiceMock,
  uiSettingsServiceMock,
} from '../../../../../src/core/server/mocks';

const createContextMock = () => {
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
    },
  };
};

const createFactoryMock = () => () => () => createContextMock();

export const contextMock = {
  create: createContextMock,
  createFactory: createFactoryMock,
};
