/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { DEFAULT_SPACE_ID } from '../../common/constants';
import { createSpacesTutorialContextFactory } from './spaces_tutorial_context_factory';
import { SpacesService } from '../spaces_service';
import { SavedObjectsLegacyService } from 'src/core/server';
import { SpacesAuditLogger } from './audit_logger';
import {
  elasticsearchServiceMock,
  coreMock,
  loggingServiceMock,
} from '../../../../../src/core/server/mocks';
import { spacesServiceMock } from '../spaces_service/spaces_service.mock';
import { LegacyAPI } from '../plugin';
import { spacesConfig } from './__fixtures__';
import { securityMock } from '../../../security/server/mocks';

const log = loggingServiceMock.createLogger();

const legacyAPI: LegacyAPI = {
  legacyConfig: {},
  savedObjects: {} as SavedObjectsLegacyService,
} as LegacyAPI;

const service = new SpacesService(log, () => legacyAPI);

describe('createSpacesTutorialContextFactory', () => {
  it('should create a valid context factory', async () => {
    const spacesService = spacesServiceMock.createSetupContract();
    expect(typeof createSpacesTutorialContextFactory(spacesService)).toEqual('function');
  });

  it('should create context with the current space id for space my-space-id', async () => {
    const spacesService = spacesServiceMock.createSetupContract('my-space-id');
    const contextFactory = createSpacesTutorialContextFactory(spacesService);

    const request = {};

    expect(contextFactory(request)).toEqual({
      spaceId: 'my-space-id',
      isInDefaultSpace: false,
    });
  });

  it('should create context with the current space id for the default space', async () => {
    const spacesService = await service.setup({
      http: coreMock.createSetup().http,
      elasticsearch: elasticsearchServiceMock.createSetupContract(),
      authorization: securityMock.createSetup().authz,
      getSpacesAuditLogger: () => ({} as SpacesAuditLogger),
      config$: Rx.of(spacesConfig),
    });
    const contextFactory = createSpacesTutorialContextFactory(spacesService);

    const request = {};

    expect(contextFactory(request)).toEqual({
      spaceId: DEFAULT_SPACE_ID,
      isInDefaultSpace: true,
    });
  });
});
