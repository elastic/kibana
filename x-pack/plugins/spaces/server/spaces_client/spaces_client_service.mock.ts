/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { spacesClientMock } from '../mocks';

import { SpacesClientServiceSetup, SpacesClientServiceStart } from './spaces_client_service';

const createSpacesClientServiceSetupMock = () =>
  ({
    registerClientWrapper: jest.fn(),
    setClientRepositoryFactory: jest.fn(),
  } as jest.Mocked<SpacesClientServiceSetup>);

const createSpacesClientServiceStartMock = () =>
  ({
    createSpacesClient: jest.fn().mockReturnValue(spacesClientMock.create()),
  } as jest.Mocked<SpacesClientServiceStart>);

export const spacesClientServiceMock = {
  createSetup: createSpacesClientServiceSetupMock,
  createStart: createSpacesClientServiceStartMock,
};
