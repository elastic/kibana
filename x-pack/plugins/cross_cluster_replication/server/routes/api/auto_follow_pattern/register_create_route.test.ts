/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import { kibanaResponseFactory, RequestHandler } from 'src/core/server';

import { isEsError } from '../../../shared_imports';
import { formatEsError } from '../../../lib/format_es_error';
import { License } from '../../../services';
import { mockRouteContext } from '../test_lib';
import { registerCreateRoute } from './register_create_route';

const httpService = httpServiceMock.createSetupContract();

describe('[CCR API] Create auto-follow pattern', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const router = httpService.createRouter();

    registerCreateRoute({
      router,
      license: {
        guardApiRoute: (route: any) => route,
      } as License,
      lib: {
        isEsError,
        formatEsError,
      },
    });

    routeHandler = router.post.mock.calls[0][1];
  });

  it('should throw a 409 conflict error if id already exists', async () => {
    const routeContextMock = mockRouteContext({
      // Fail the uniqueness check.
      callAsCurrentUser: jest.fn().mockResolvedValueOnce(true),
    });

    const request = httpServerMock.createKibanaRequest({
      body: {
        id: 'some-id',
        foo: 'bar',
      },
    });

    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);
    expect(response.status).toEqual(409);
  });

  it('should return 200 status when the id does not exist', async () => {
    const routeContextMock = mockRouteContext({
      callAsCurrentUser: jest
        .fn()
        // Pass the uniqueness check.
        .mockRejectedValueOnce({ statusCode: 404 })
        .mockResolvedValueOnce(true),
    });

    const request = httpServerMock.createKibanaRequest({
      body: {
        id: 'some-id',
        foo: 'bar',
      },
    });

    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
  });
});
