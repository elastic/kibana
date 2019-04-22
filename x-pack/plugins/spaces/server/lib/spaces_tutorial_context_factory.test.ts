/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../common/constants';
import { createSpacesTutorialContextFactory } from './spaces_tutorial_context_factory';
import { SpacesService } from '../new_platform/spaces_service';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { SavedObjectsService } from 'src/legacy/server/kbn_server';
import { SecurityPlugin } from '../../../security';
import { SpacesAuditLogger } from './audit_logger';

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

const log = {
  log: jest.fn(),
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
};

const service = new SpacesService(log, server.config());

describe('createSpacesTutorialContextFactory', () => {
  it('should create a valid context factory', async () => {
    const spacesService = await service.setup({
      elasticsearch: ({
        getCluster: jest.fn().mockReturnValue({
          callWithRequest: jest.fn(),
          callWithInternalUser: jest.fn(),
        }),
      } as unknown) as ElasticsearchPlugin,
      savedObjects: {} as SavedObjectsService,
      security: {} as SecurityPlugin,
      spacesAuditLogger: {} as SpacesAuditLogger,
    });
    expect(typeof createSpacesTutorialContextFactory(spacesService)).toEqual('function');
  });

  it('should create context with the current space id for space my-space-id', async () => {
    const spacesService = await service.setup({
      elasticsearch: ({
        getCluster: jest.fn().mockReturnValue({
          callWithRequest: jest.fn(),
          callWithInternalUser: jest.fn(),
        }),
      } as unknown) as ElasticsearchPlugin,
      savedObjects: {} as SavedObjectsService,
      security: {} as SecurityPlugin,
      spacesAuditLogger: {} as SpacesAuditLogger,
    });
    const contextFactory = createSpacesTutorialContextFactory(spacesService);

    const request = {
      getBasePath: () => '/foo/s/my-space-id',
    };

    expect(contextFactory(request)).toEqual({
      spaceId: 'my-space-id',
      isInDefaultSpace: false,
    });
  });

  it('should create context with the current space id for the default space', async () => {
    const spacesService = await service.setup({
      elasticsearch: ({
        getCluster: jest.fn().mockReturnValue({
          callWithRequest: jest.fn(),
          callWithInternalUser: jest.fn(),
        }),
      } as unknown) as ElasticsearchPlugin,
      savedObjects: {} as SavedObjectsService,
      security: {} as SecurityPlugin,
      spacesAuditLogger: {} as SpacesAuditLogger,
    });
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
