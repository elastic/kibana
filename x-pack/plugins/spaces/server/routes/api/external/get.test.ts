/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Rx from 'rxjs';
import {
  createSpaces,
  createLegacyAPI,
  createMockSavedObjectsRepository,
  mockRouteContextWithInvalidLicense,
  mockRouteContext,
} from '../__fixtures__';
import { initGetSpaceApi } from './get';
import { CoreSetup, IRouter, kibanaResponseFactory } from 'src/core/server';
import {
  loggingServiceMock,
  elasticsearchServiceMock,
  httpServiceMock,
  httpServerMock,
} from 'src/core/server/mocks';
import { SpacesService } from '../../../spaces_service';
import { SpacesAuditLogger } from '../../../lib/audit_logger';
import { SpacesClient } from '../../../lib/spaces_client';
import { spacesConfig } from '../../../lib/__fixtures__';
import { securityMock } from '../../../../../security/server/mocks';

describe('GET space', () => {
  const spacesSavedObjects = createSpaces();
  const spaces = spacesSavedObjects.map(s => ({ id: s.id, ...s.attributes }));

  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter('') as jest.Mocked<IRouter>;

    const legacyAPI = createLegacyAPI({ spaces });

    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

    const log = loggingServiceMock.create().get('spaces');

    const service = new SpacesService(log, () => legacyAPI);
    const spacesService = await service.setup({
      http: (httpService as unknown) as CoreSetup['http'],
      elasticsearch: elasticsearchServiceMock.createSetupContract(),
      authorization: securityMock.createSetup().authz,
      getSpacesAuditLogger: () => ({} as SpacesAuditLogger),
      config$: Rx.of(spacesConfig),
    });

    spacesService.scopedClient = jest.fn((req: any) => {
      return Promise.resolve(
        new SpacesClient(
          null as any,
          () => null,
          null,
          savedObjectsRepositoryMock,
          spacesConfig,
          savedObjectsRepositoryMock,
          req
        )
      );
    });

    initGetSpaceApi({
      externalRouter: router,
      getSavedObjects: () => legacyAPI.savedObjects,
      log,
      spacesService,
    });

    return {
      routeHandler: router.get.mock.calls[0][1],
    };
  };

  it(`returns http/403 when the license is invalid`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
    });

    const response = await routeHandler(
      mockRouteContextWithInvalidLicense,
      request,
      kibanaResponseFactory
    );

    expect(response.status).toEqual(403);
    expect(response.payload).toEqual({
      message: 'License is invalid for spaces',
    });
  });

  it(`returns the space with that id`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'default',
      },
      method: 'get',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(200);
    expect(response.payload).toEqual(spaces.find(s => s.id === 'default'));
  });

  it(`'GET spaces/{id}' returns 404 when retrieving a non-existent space`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'not-a-space',
      },
      method: 'get',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(404);
  });
});
