/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';

import { spacesClientServiceMock } from './spaces_client/spaces_client_service.mock';
import { spacesServiceMock } from './spaces_service/spaces_service.mock';

function createSetupMock() {
  return {
    spacesService: spacesServiceMock.createSetupContract(),
    spacesClient: spacesClientServiceMock.createSetup(),
    hasOnlyDefaultSpace$: of(false),
  };
}

function createStartMock() {
  return {
    spacesService: spacesServiceMock.createStartContract(),
    hasOnlyDefaultSpace$: of(false),
  };
}

export const spacesMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
};

export { spacesClientMock } from './spaces_client/spaces_client.mock';
