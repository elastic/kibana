/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { spacesClientServiceMock } from './spaces_client/spaces_client_service.mock';
import { spacesServiceMock } from './spaces_service/spaces_service.mock';

function createSetupMock() {
  return {
    spacesService: spacesServiceMock.createSetupContract(),
    spacesClient: spacesClientServiceMock.createSetup(),
  };
}

function createStartMock() {
  return {
    spacesService: spacesServiceMock.createStartContract(),
  };
}

export const spacesMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
};

export { spacesClientMock } from './spaces_client/spaces_client.mock';
