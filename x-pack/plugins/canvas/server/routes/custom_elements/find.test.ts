/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AwaitedProperties } from '@kbn/utility-types';
import { initializeFindCustomElementsRoute } from './find';
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

describe('Find custom element', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const routerDeps = getMockedRouterDeps();
    initializeFindCustomElementsRoute(routerDeps);

    routeHandler = routerDeps.router.get.mock.calls[0][1];
  });

  it(`returns 200 with the found custom elements`, async () => {
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
      path: `api/canvas/custom-elements/find`,
      query: {
        name,
        perPage,
      },
    });

    const response = await routeHandler(
      coreMock.createCustomRequestHandlerContext(mockRouteContext),
      request,
      kibanaResponseFactory
    );
    expect(response.status).toBe(200);
    expect(findMock.mock.calls[0][0].search).toBe(`${name}* | ${name}`);
    expect(findMock.mock.calls[0][0].perPage).toBe(perPage);

    expect(response.payload).toMatchInlineSnapshot(`
      Object {
        "customElements": Array [
          Object {
            "id": 1,
            "key": "value",
          },
          Object {
            "id": 2,
            "key": "other-value",
          },
        ],
        "total": 2,
      }
    `);
  });

  it(`returns 200 with empty results on error`, async () => {
    (mockRouteContext.core.savedObjects.client.find as jest.Mock).mockImplementationOnce(() => {
      throw new Error('generic error');
    });

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `api/canvas/custom-elements/find`,
      query: {
        name: 'something',
        perPage: 1000,
      },
    });

    const response = await routeHandler(
      coreMock.createCustomRequestHandlerContext(mockRouteContext),
      request,
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toMatchInlineSnapshot(`
      Object {
        "customElements": Array [],
        "total": 0,
      }
    `);
  });
});
