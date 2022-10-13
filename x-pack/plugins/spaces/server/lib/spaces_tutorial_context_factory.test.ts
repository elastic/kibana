/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';

import { DEFAULT_SPACE_ID } from '../../common/constants';
import { spacesClientServiceMock } from '../spaces_client/spaces_client_service.mock';
import { SpacesService } from '../spaces_service';
import { spacesServiceMock } from '../spaces_service/spaces_service.mock';
import { createSpacesTutorialContextFactory } from './spaces_tutorial_context_factory';

const service = new SpacesService();

describe('createSpacesTutorialContextFactory', () => {
  it('should create a valid context factory', async () => {
    const spacesService = spacesServiceMock.createStartContract();
    expect(typeof createSpacesTutorialContextFactory(() => spacesService)).toEqual('function');
  });

  it('should create context with the current space id for space my-space-id', async () => {
    const spacesService = spacesServiceMock.createStartContract('my-space-id');
    const contextFactory = createSpacesTutorialContextFactory(() => spacesService);

    const request = httpServerMock.createKibanaRequest();

    expect(contextFactory(request)).toEqual({
      spaceId: 'my-space-id',
      isInDefaultSpace: false,
    });
  });

  it('should create context with the current space id for the default space', async () => {
    service.setup({
      basePath: coreMock.createSetup().http.basePath,
    });
    const contextFactory = createSpacesTutorialContextFactory(() =>
      service.start({
        basePath: coreMock.createStart().http.basePath,
        spacesClientService: spacesClientServiceMock.createStart(),
      })
    );

    const request = httpServerMock.createKibanaRequest();

    expect(contextFactory(request)).toEqual({
      spaceId: DEFAULT_SPACE_ID,
      isInDefaultSpace: true,
    });
  });
});
