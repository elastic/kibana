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
  mockRouteContext,
  mockRouteContextWithInvalidLicense,
} from '../__fixtures__';
import { CoreSetup, kibanaResponseFactory, IRouter } from 'src/core/server';
import {
  loggingServiceMock,
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
} from 'src/core/server/mocks';
import { SpacesService } from '../../../spaces_service';
import { SpacesAuditLogger } from '../../../lib/audit_logger';
import { SpacesClient } from '../../../lib/spaces_client';
import { initPostSpacesApi } from './post';
import { RouteSchemas } from 'src/core/server/http/router/route';
import { ObjectType } from '@kbn/config-schema';
import { spacesConfig } from '../../../lib/__fixtures__';
import { securityMock } from '../../../../../security/server/mocks';

describe('Spaces Public API', () => {
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

    initPostSpacesApi({
      externalRouter: router,
      getSavedObjects: () => legacyAPI.savedObjects,
      log,
      spacesService,
    });

    const [routeDefinition, routeHandler] = router.post.mock.calls[0];

    return {
      routeValidation: routeDefinition.validate as RouteSchemas<ObjectType, ObjectType, ObjectType>,
      routeHandler,
      savedObjectsRepositoryMock,
    };
  };

  it('should create a new space with the provided ID', async () => {
    const payload = {
      id: 'my-space-id',
      name: 'my new space',
      description: 'with a description',
      disabledFeatures: ['foo'],
    };

    const { routeHandler, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      body: payload,
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(200);
    expect(savedObjectsRepositoryMock.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.create).toHaveBeenCalledWith(
      'space',
      { name: 'my new space', description: 'with a description', disabledFeatures: ['foo'] },
      { id: 'my-space-id' }
    );
  });

  it(`returns http/403 when the license is invalid`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
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

  it('should not allow a space to be updated', async () => {
    const payload = {
      id: 'a-space',
      name: 'my updated space',
      description: 'with a description',
    };

    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      body: payload,
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status, payload: responsePayload } = response;

    expect(status).toEqual(409);
    expect(responsePayload.message).toEqual('space conflict');
  });

  it('should not require disabledFeatures to be specified', async () => {
    const payload = {
      id: 'my-space-id',
      name: 'my new space',
      description: 'with a description',
    };

    const { routeValidation, routeHandler, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      body: routeValidation.body!.validate(payload),
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(200);
    expect(savedObjectsRepositoryMock.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.create).toHaveBeenCalledWith(
      'space',
      { name: 'my new space', description: 'with a description', disabledFeatures: [] },
      { id: 'my-space-id' }
    );
  });
});
