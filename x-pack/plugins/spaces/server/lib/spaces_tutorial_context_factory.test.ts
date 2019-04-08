/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../common/constants';
import { createSpacesService } from './create_spaces_service';
import { createSpacesTutorialContextFactory } from './spaces_tutorial_context_factory';

const server = {
  config: () => {
    return {
      get: (key: string) => {
        if (key === 'server.basePath') {
          return '/foo';
        }
        throw new Error('unexpected key ' + key);
      },
    };
  },
};

describe('createSpacesTutorialContextFactory', () => {
  it('should create a valid context factory', () => {
    const spacesService = createSpacesService(server);
    expect(typeof createSpacesTutorialContextFactory(spacesService)).toEqual('function');
  });

  it('should create context with the current space id for space my-space-id', () => {
    const spacesService = createSpacesService(server);
    const contextFactory = createSpacesTutorialContextFactory(spacesService);

    const request = {
      getBasePath: () => '/foo/s/my-space-id',
    };

    expect(contextFactory(request)).toEqual({
      spaceId: 'my-space-id',
      isInDefaultSpace: false,
    });
  });

  it('should create context with the current space id for the default space', () => {
    const spacesService = createSpacesService(server);
    const contextFactory = createSpacesTutorialContextFactory(spacesService);

    const request = {
      getBasePath: () => '/foo',
    };

    expect(contextFactory(request)).toEqual({
      spaceId: DEFAULT_SPACE_ID,
      isInDefaultSpace: true,
    });
  });
});
