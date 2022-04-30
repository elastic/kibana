/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';

import type { SpacesPluginStart } from './plugin';
import type { SpacesApi } from './types';
import type { SpacesApiUi, SpacesApiUiComponent } from './ui_api';

const createApiMock = (): jest.Mocked<SpacesApi> => ({
  getActiveSpace$: jest.fn().mockReturnValue(of()),
  getActiveSpace: jest.fn(),
  ui: createApiUiMock(),
});

type SpacesApiUiMock = Omit<jest.Mocked<SpacesApiUi>, 'components'> & {
  components: SpacesApiUiComponentMock;
};

const createApiUiMock = () => {
  const mock: SpacesApiUiMock = {
    components: createApiUiComponentsMock(),
    redirectLegacyUrl: jest.fn(),
    useSpaces: jest.fn(),
  };

  return mock;
};

type SpacesApiUiComponentMock = jest.Mocked<SpacesApiUiComponent>;

const createApiUiComponentsMock = () => {
  const mock: SpacesApiUiComponentMock = {
    getSpacesContextProvider: jest.fn(),
    getShareToSpaceFlyout: jest.fn(),
    getCopyToSpaceFlyout: jest.fn(),
    getSpaceList: jest.fn(),
    getLegacyUrlConflict: jest.fn(),
    getSpaceAvatar: jest.fn(),
    getEmbeddableLegacyUrlConflict: jest.fn(),
  };

  return mock;
};

const createStartContract = (): jest.Mocked<SpacesPluginStart> => createApiMock();

export const spacesPluginMock = {
  createStartContract,
};
