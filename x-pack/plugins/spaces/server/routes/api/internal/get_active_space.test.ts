/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';

import { spacesClientServiceMock } from '../../../spaces_client/spaces_client_service.mock';
import { SpacesService } from '../../../spaces_service';
import { mockRouteContextWithInvalidLicense } from '../__fixtures__';
import { initGetActiveSpaceApi } from './get_active_space';

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
