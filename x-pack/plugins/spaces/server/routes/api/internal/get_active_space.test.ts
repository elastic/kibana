/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mockRouteContextWithInvalidLicense } from '../__fixtures__';
import { kibanaResponseFactory } from 'src/core/server';
import { httpServiceMock, httpServerMock, coreMock } from 'src/core/server/mocks';
import { SpacesService } from '../../../spaces_service';
import { initGetActiveSpaceApi } from './get_active_space';
import { spacesClientServiceMock } from '../../../spaces_client/spaces_client_service.mock';

describe('GET /internal/spaces/_active_space', () => {
  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpServiceMock.createRouter();

    const coreStart = coreMock.createStart();

    const service = new SpacesService();
    service.setup({
      basePath: httpService.basePath,
    });

    initGetActiveSpaceApi({
      internalRouter: router,
      getSpacesService: () =>
        service.start({
          basePath: coreStart.http.basePath,
          spacesClientService: spacesClientServiceMock.createStart(),
        }),
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
});
