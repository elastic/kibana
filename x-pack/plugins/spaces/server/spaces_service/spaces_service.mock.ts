/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesServiceSetup, SpacesServiceStart } from './spaces_service';
import { spacesClientMock } from '../spaces_client/spaces_client.mock';
import { DEFAULT_SPACE_ID } from '../../common/constants';
import { namespaceToSpaceId, spaceIdToNamespace } from '../lib/utils/namespace';

const createSetupContractMock = (spaceId = DEFAULT_SPACE_ID) => {
  const setupContract: jest.Mocked<SpacesServiceSetup> = {
    namespaceToSpaceId: jest.fn().mockImplementation(namespaceToSpaceId),
    spaceIdToNamespace: jest.fn().mockImplementation(spaceIdToNamespace),
    getSpaceId: jest.fn().mockReturnValue(spaceId),
  };
  return setupContract;
};

const createStartContractMock = (spaceId = DEFAULT_SPACE_ID) => {
  const startContract: jest.Mocked<SpacesServiceStart> = {
    namespaceToSpaceId: jest.fn().mockImplementation(namespaceToSpaceId),
    spaceIdToNamespace: jest.fn().mockImplementation(spaceIdToNamespace),
    createSpacesClient: jest.fn().mockReturnValue(spacesClientMock.create()),
    getSpaceId: jest.fn().mockReturnValue(spaceId),
    isInDefaultSpace: jest.fn().mockReturnValue(spaceId === DEFAULT_SPACE_ID),
    getActiveSpace: jest.fn(),
  };
  return startContract;
};

export const spacesServiceMock = {
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
