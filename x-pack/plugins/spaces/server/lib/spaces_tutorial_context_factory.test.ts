/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { DEFAULT_SPACE_ID } from '../../common/constants';
import { createSpacesTutorialContextFactory } from './spaces_tutorial_context_factory';
import { SpacesService } from '../new_platform/spaces_service';
import { SavedObjectsService } from '../../../../../src/legacy/server/kbn_server';
import { SecurityPlugin } from '../../../security';
import { SpacesAuditLogger } from './audit_logger';
import { ElasticsearchServiceSetup } from '../../../../../src/core/server';
import { SpacesConfig } from '../new_platform/config';

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

const service = new SpacesService(log, server.config().get('server.basePath'));

describe('createSpacesTutorialContextFactory', () => {
  it('should create a valid context factory', async () => {
    const spacesService = await service.setup({
      elasticsearch: ({
        adminClient$: Rx.of({
          callAsInternalUser: jest.fn(),
          asScoped: jest.fn(req => ({
            callWithRequest: jest.fn(),
          })),
        }),
      } as unknown) as ElasticsearchServiceSetup,
      savedObjects: {} as SavedObjectsService,
      getSecurity: () => ({} as SecurityPlugin),
      spacesAuditLogger: {} as SpacesAuditLogger,
      config$: Rx.of(new SpacesConfig({ maxSpaces: 1000 })),
    });
    expect(typeof createSpacesTutorialContextFactory(spacesService)).toEqual('function');
  });

  it('should create context with the current space id for space my-space-id', async () => {
    const spacesService = await service.setup({
      elasticsearch: ({
        adminClient$: Rx.of({
          callAsInternalUser: jest.fn(),
          asScoped: jest.fn(req => ({
            callWithRequest: jest.fn(),
          })),
        }),
      } as unknown) as ElasticsearchServiceSetup,
      savedObjects: {} as SavedObjectsService,
      getSecurity: () => ({} as SecurityPlugin),
      spacesAuditLogger: {} as SpacesAuditLogger,
      config$: Rx.of(new SpacesConfig({ maxSpaces: 1000 })),
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
        adminClient$: Rx.of({
          callAsInternalUser: jest.fn(),
          asScoped: jest.fn(req => ({
            callWithRequest: jest.fn(),
          })),
        }),
      } as unknown) as ElasticsearchServiceSetup,
      savedObjects: {} as SavedObjectsService,
      getSecurity: () => ({} as SecurityPlugin),
      spacesAuditLogger: {} as SpacesAuditLogger,
      config$: Rx.of(new SpacesConfig({ maxSpaces: 1000 })),
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
