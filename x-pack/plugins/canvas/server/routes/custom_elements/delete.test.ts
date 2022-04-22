/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AwaitedProperties } from '@kbn/utility-types';
import { CUSTOM_ELEMENT_TYPE } from '../../../common/lib/constants';
import { initializeDeleteCustomElementRoute } from './delete';
import { kibanaResponseFactory, RequestHandlerContext, RequestHandler } from '@kbn/core/server';
import { savedObjectsClientMock, httpServerMock, coreMock } from '@kbn/core/server/mocks';
import { getMockedRouterDeps } from '../test_helpers';

const mockRouteContext = {
  core: {
    savedObjects: {
      client: savedObjectsClientMock.create(),
    },
  },
} as unknown as AwaitedProperties<RequestHandlerContext>;

describe('DELETE custom element', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const routerDeps = getMockedRouterDeps();
    initializeDeleteCustomElementRoute(routerDeps);

    routeHandler = routerDeps.router.delete.mock.calls[0][1];
  });

  it(`returns 200 ok when the custom element is deleted`, async () => {
    const id = 'some-id';
    const request = httpServerMock.createKibanaRequest({
      method: 'delete',
      path: `api/canvas/custom-element/${id}`,
      params: {
        id,
      },
    });

    const response = await routeHandler(
      coreMock.createCustomRequestHandlerContext(mockRouteContext),
      request,
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ ok: true });
    expect(mockRouteContext.core.savedObjects.client.delete).toBeCalledWith(
      CUSTOM_ELEMENT_TYPE,
      id
    );
  });

  it(`returns bad request if delete is unsuccessful`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'delete',
      path: `api/canvas/custom-element/some-id`,
      params: {
        id: 'some-id',
      },
    });

    (mockRouteContext.core.savedObjects.client.delete as jest.Mock).mockImplementationOnce(() => {
      throw mockRouteContext.core.savedObjects.client.errors.createBadRequestError('bad request');
    });

    const response = await routeHandler(
      coreMock.createCustomRequestHandlerContext(mockRouteContext),
      request,
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
  });
});
