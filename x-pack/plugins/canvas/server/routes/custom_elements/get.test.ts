/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_ELEMENT_TYPE } from '../../../common/lib/constants';
import { initializeGetCustomElementRoute } from './get';
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

describe('GET custom element', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const routerDeps = getMockedRouterDeps();
    initializeGetCustomElementRoute(routerDeps);

    routeHandler = routerDeps.router.get.mock.calls[0][1];
  });

  it(`returns 200 when the custom element is found`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: 'api/canvas/custom-element/123',
      params: {
        id: '123',
      },
    });

    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '123',
      type: CUSTOM_ELEMENT_TYPE,
      attributes: { foo: true },
      references: [],
    });

    mockRouteContext.core.savedObjects.client = savedObjectsClient;

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toMatchInlineSnapshot(`
      Object {
        "foo": true,
        "id": "123",
      }
    `);

    expect(savedObjectsClient.get.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "canvas-element",
          "123",
        ],
      ]
    `);
  });

  it('returns 404 if the custom element is not found', async () => {
    const id = '123';
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: 'api/canvas/custom-element/123',
      params: {
        id,
      },
    });

    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get.mockImplementation(() => {
      throw savedObjectsClient.errors.createGenericNotFoundError(CUSTOM_ELEMENT_TYPE, id);
    });
    mockRouteContext.core.savedObjects.client = savedObjectsClient;

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.payload).toMatchInlineSnapshot(`
      Object {
        "error": "Not Found",
        "message": "Saved object [canvas-element/123] not found",
        "statusCode": 404,
      }
    `);
  });
});
