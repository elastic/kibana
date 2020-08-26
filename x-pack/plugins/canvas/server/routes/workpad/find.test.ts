/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initializeFindWorkpadsRoute } from './find';
import { kibanaResponseFactory, RequestHandlerContext, RequestHandler } from 'src/core/server';
import { savedObjectsClientMock, httpServerMock } from 'src/core/server/mocks';
import { getMockedRouterDeps } from '../test_helpers';

const mockRouteContext = ({
  core: {
    savedObjects: {
      client: savedObjectsClientMock.create(),
    },
  },
} as unknown) as RequestHandlerContext;

describe('Find workpad', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const routerDeps = getMockedRouterDeps();
    initializeFindWorkpadsRoute(routerDeps);

    routeHandler = routerDeps.router.get.mock.calls[0][1];
  });

  it(`returns 200 with the found workpads`, async () => {
    const name = 'something';
    const perPage = 10000;
    const mockResults = {
      total: 2,
      saved_objects: [
        { id: 1, attributes: { key: 'value' } },
        { id: 2, attributes: { key: 'other-value' } },
      ],
    };

    const findMock = mockRouteContext.core.savedObjects.client.find as jest.Mock;

    findMock.mockResolvedValueOnce(mockResults);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `api/canvas/workpad/find`,
      query: {
        name,
        perPage,
      },
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);
    expect(response.status).toBe(200);
    expect(findMock.mock.calls[0][0].search).toBe(`${name}* | ${name}`);
    expect(findMock.mock.calls[0][0].perPage).toBe(perPage);

    expect(response.payload).toMatchInlineSnapshot(`
      Object {
        "total": 2,
        "workpads": Array [
          Object {
            "id": 1,
            "key": "value",
          },
          Object {
            "id": 2,
            "key": "other-value",
          },
        ],
      }
    `);
  });

  it(`returns 200 with empty results on error`, async () => {
    (mockRouteContext.core.savedObjects.client.find as jest.Mock).mockImplementationOnce(() => {
      throw new Error('generic error');
    });

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `api/canvas/workpad/find`,
      query: {
        name: 'something',
        perPage: 1000,
      },
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toMatchInlineSnapshot(`
      Object {
        "total": 0,
        "workpads": Array [],
      }
    `);
  });
});
