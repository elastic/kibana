/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesServiceSetup, SpacesServiceStart } from './spaces_service';
import { spacesClientMock } from '../lib/spaces_client/spaces_client.mock';
import { DEFAULT_SPACE_ID } from '../../common/constants';
import { namespaceToSpaceId, spaceIdToNamespace } from '../lib/utils/namespace';

const createSetupContractMock = (spaceId = DEFAULT_SPACE_ID) => {
  const setupContract: jest.Mocked<SpacesServiceSetup> = {
    getSpaceId: jest.fn().mockReturnValue(spaceId),
    isInDefaultSpace: jest.fn().mockReturnValue(spaceId === DEFAULT_SPACE_ID),
    getBasePath: jest.fn().mockReturnValue(''),
    scopedClient: jest.fn().mockReturnValue(spacesClientMock.create()),
    namespaceToSpaceId: jest.fn().mockImplementation(namespaceToSpaceId),
    spaceIdToNamespace: jest.fn().mockImplementation(spaceIdToNamespace),
    getActiveSpace: jest.fn(),
    clientService: {
      registerClientWrapper: jest.fn(),
      setRepositoryFactory: jest.fn(),
    },
  };
  return setupContract;
};

const createStartContractMock = () => {
  const startContract: jest.Mocked<SpacesServiceStart> = {
    createSpacesClient: jest.fn().mockReturnValue(spacesClientMock.create()),
  };
  return startContract;
};

export const spacesServiceMock = {
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
