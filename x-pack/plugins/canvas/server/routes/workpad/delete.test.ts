/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CANVAS_TYPE } from '../../../common/lib/constants';
import { initializeDeleteWorkpadRoute } from './delete';
import { kibanaResponseFactory, RequestHandlerContext, RequestHandler } from '@kbn/core/server';
import { savedObjectsClientMock, httpServerMock } from '@kbn/core/server/mocks';
import { getMockedRouterDeps } from '../test_helpers';

const mockRouteContext = {
  core: {
    savedObjects: {
      client: savedObjectsClientMock.create(),
    },
  },
} as unknown as RequestHandlerContext;

describe('DELETE workpad', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const routerDeps = getMockedRouterDeps();
    initializeDeleteWorkpadRoute(routerDeps);

    routeHandler = routerDeps.router.delete.mock.calls[0][1];
  });

  it(`returns 200 ok when the workpad is deleted`, async () => {
    const id = 'some-id';
    const request = httpServerMock.createKibanaRequest({
      method: 'delete',
      path: `api/canvas/workpad/${id}`,
      params: {
        id,
      },
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ ok: true });
    expect(mockRouteContext.core.savedObjects.client.delete).toBeCalledWith(CANVAS_TYPE, id);
  });

  it(`returns bad request if delete is unsuccessful`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'delete',
      path: `api/canvas/workpad/some-id`,
      params: {
        id: 'some-id',
      },
    });

    (mockRouteContext.core.savedObjects.client.delete as jest.Mock).mockImplementationOnce(() => {
      throw mockRouteContext.core.savedObjects.client.errors.createBadRequestError('bad request');
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(400);
  });
});
