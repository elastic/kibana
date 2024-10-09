/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import type { RouteValidatorConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';

import { initSetSolutionSpaceApi } from './set_solution_space';
import { spacesConfig } from '../../../lib/__fixtures__';
import { SpacesClientService } from '../../../spaces_client';
import { SpacesService } from '../../../spaces_service';
import {
  createMockSavedObjectsRepository,
  createSpaces,
  mockRouteContext,
  mockRouteContextWithInvalidLicense,
} from '../__fixtures__';

describe('PUT /internal/spaces/space/{id}/solution', () => {
  const spacesSavedObjects = createSpaces();

  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();

    const coreStart = coreMock.createStart();

    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

    const clientService = new SpacesClientService(jest.fn(), 'traditional');
    clientService
      .setup({ config$: Rx.of(spacesConfig) })
      .setClientRepositoryFactory(() => savedObjectsRepositoryMock);

    const service = new SpacesService();
    service.setup({
      basePath: httpService.basePath,
    });

    const clientServiceStart = clientService.start(coreStart, featuresPluginMock.createStart());

    const spacesServiceStart = service.start({
      basePath: coreStart.http.basePath,
      spacesClientService: clientServiceStart,
    });

    initSetSolutionSpaceApi({
      router,
      getSpacesService: () => spacesServiceStart,
    });

    const [routeDefinition, routeHandler] = router.put.mock.calls[0];

    return {
      routeValidation: routeDefinition.validate as RouteValidatorConfig<{}, {}, {}>,
      routeHandler,
      savedObjectsRepositoryMock,
    };
  };

  it('should update the solution an existing space with the provided ID', async () => {
    const payload = {
      solution: 'oblt',
    };

    const { routeHandler, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'a-space',
      },
      body: payload,
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(200);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledWith('space', 'a-space', {
      solution: 'oblt',
      name: 'a space',
      color: undefined,
      description: undefined,
      disabledFeatures: [],
      imageUrl: undefined,
      initials: undefined,
    });
  });

  it('should update the solution_type an existing space with the provided ID', async () => {
    const payload = {
      solution_type: 'observability',
    };

    const { routeHandler, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'a-space',
      },
      body: payload,
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(200);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledWith('space', 'a-space', {
      solution: 'oblt',
      name: 'a space',
      color: undefined,
      description: undefined,
      disabledFeatures: [],
      imageUrl: undefined,
      initials: undefined,
    });
  });

  it('should not allow a new space to be created', async () => {
    const payload = {
      solution: 'oblt',
    };

    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'a-new-space',
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
