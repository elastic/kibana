/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import type { ObjectType } from '@kbn/config-schema';
import type { RouteValidatorConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';

import { spacesConfig } from '../../../lib/__fixtures__';
import { SpacesClientService } from '../../../spaces_client';
import { SpacesService } from '../../../spaces_service';
import { usageStatsServiceMock } from '../../../usage_stats/usage_stats_service.mock';
import {
  createMockSavedObjectsRepository,
  createSpaces,
  mockRouteContext,
  mockRouteContextWithInvalidLicense,
} from '../__fixtures__';
import { initPutSpacesApi } from './put';

describe('PUT /api/spaces/space', () => {
  const spacesSavedObjects = createSpaces();

  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();

    const coreStart = coreMock.createStart();

    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

    const log = loggingSystemMock.create().get('spaces');

    const clientService = new SpacesClientService(jest.fn());
    clientService
      .setup({ config$: Rx.of(spacesConfig) })
      .setClientRepositoryFactory(() => savedObjectsRepositoryMock);

    const service = new SpacesService();
    service.setup({
      basePath: httpService.basePath,
    });

    const usageStatsServicePromise = Promise.resolve(usageStatsServiceMock.createSetupContract());

    const clientServiceStart = clientService.start(coreStart);

    const spacesServiceStart = service.start({
      basePath: coreStart.http.basePath,
      spacesClientService: clientServiceStart,
    });

    initPutSpacesApi({
      externalRouter: router,
      getStartServices: async () => [coreStart, {}, {}],
      log,
      getSpacesService: () => spacesServiceStart,
      usageStatsServicePromise,
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
