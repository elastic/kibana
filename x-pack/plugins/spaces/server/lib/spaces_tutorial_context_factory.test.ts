/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { DEFAULT_SPACE_ID } from '../../common/constants';
import { createSpacesTutorialContextFactory } from './spaces_tutorial_context_factory';
import { SpacesService } from '../spaces_service';
import { coreMock, loggingSystemMock } from '../../../../../src/core/server/mocks';
import { spacesServiceMock } from '../spaces_service/spaces_service.mock';
import { spacesConfig } from './__fixtures__';

const log = loggingSystemMock.createLogger();

const service = new SpacesService(log);

describe('createSpacesTutorialContextFactory', () => {
  it('should create a valid context factory', async () => {
    const spacesService = spacesServiceMock.createStartContract();
    expect(typeof createSpacesTutorialContextFactory(() => spacesService)).toEqual('function');
  });

  it('should create context with the current space id for space my-space-id', async () => {
    const spacesService = spacesServiceMock.createStartContract('my-space-id');
    const contextFactory = createSpacesTutorialContextFactory(() => spacesService);

    const request = {};

    expect(contextFactory(request)).toEqual({
      spaceId: 'my-space-id',
      isInDefaultSpace: false,
    });
  });

  it('should create context with the current space id for the default space', async () => {
    service.setup({
      http: coreMock.createSetup().http,
      config$: Rx.of(spacesConfig),
    });
    const contextFactory = createSpacesTutorialContextFactory(() =>
      service.start(coreMock.createStart())
    );

    const request = {};

    expect(contextFactory(request)).toEqual({
      spaceId: DEFAULT_SPACE_ID,
      isInDefaultSpace: true,
    });
  });
});
