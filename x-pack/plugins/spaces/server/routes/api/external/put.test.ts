/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import {
  createSpaces,
  createMockSavedObjectsRepository,
  mockRouteContext,
  mockRouteContextWithInvalidLicense,
} from '../__fixtures__';
import { CoreSetup, kibanaResponseFactory, RouteValidatorConfig } from 'src/core/server';
import {
  loggingSystemMock,
  httpServiceMock,
  httpServerMock,
  coreMock,
} from 'src/core/server/mocks';
import { SpacesService } from '../../../spaces_service';
import { initPutSpacesApi } from './put';
import { spacesConfig } from '../../../lib/__fixtures__';
import { ObjectType } from '@kbn/config-schema';

describe('PUT /api/spaces/space', () => {
  const spacesSavedObjects = createSpaces();

  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();

    const coreStart = coreMock.createStart();

    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

    const log = loggingSystemMock.create().get('spaces');

    const service = new SpacesService(log);
    const spacesServiceSetup = service.setup({
      http: (httpService as unknown) as CoreSetup['http'],
      config$: Rx.of(spacesConfig),
    });

    spacesServiceSetup.clientService.setClientRepositoryFactory(() => savedObjectsRepositoryMock);

    const spacesServiceStart = service.start(coreStart);

    initPutSpacesApi({
      externalRouter: router,
      getStartServices: async () => [coreStart, {}, {}],
      getImportExportObjectLimit: () => 1000,
      log,
      getSpacesService: () => spacesServiceStart,
    });

    const [routeDefinition, routeHandler] = router.put.mock.calls[0];

    return {
      routeValidation: routeDefinition.validate as RouteValidatorConfig<{}, {}, {}>,
      routeHandler,
      savedObjectsRepositoryMock,
    };
  };

  it('should update an existing space with the provided ID', async () => {
    const payload = {
      id: 'a-space',
      name: 'my updated space',
      description: 'with a description',
      disabledFeatures: [],
    };

    const { routeHandler, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: payload.id,
      },
      body: payload,
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(200);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledWith('space', 'a-space', {
      name: 'my updated space',
      description: 'with a description',
      disabledFeatures: [],
    });
  });

  it('should allow an empty description', async () => {
    const payload = {
      id: 'a-space',
      name: 'my updated space',
      description: '',
      disabledFeatures: ['foo'],
    };

    const { routeHandler, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: payload.id,
      },
      body: payload,
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(200);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledWith('space', 'a-space', {
      name: 'my updated space',
      description: '',
      disabledFeatures: ['foo'],
    });
  });

  it('should not require disabledFeatures', async () => {
    const payload = {
      id: 'a-space',
      name: 'my updated space',
      description: '',
    };

    const { routeHandler, routeValidation, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: payload.id,
      },
      body: (routeValidation.body as ObjectType).validate(payload),
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(200);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledWith('space', 'a-space', {
      name: 'my updated space',
      description: '',
      disabledFeatures: [],
    });
  });

  it('should not allow a new space to be created', async () => {
    const payload = {
      id: 'a-new-space',
      name: 'my new space',
      description: 'with a description',
    };

    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: payload.id,
      },
      body: payload,
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(404);
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
});
