/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AwaitedProperties } from '@kbn/utility-types';
import { initializeESFieldsRoute } from './es_fields';
import { kibanaResponseFactory, RequestHandlerContext, RequestHandler } from '@kbn/core/server';
import { httpServerMock, elasticsearchServiceMock, coreMock } from '@kbn/core/server/mocks';
import { getMockedRouterDeps } from '../test_helpers';

const mockRouteContext = {
  core: {
    elasticsearch: {
      client: elasticsearchServiceMock.createScopedClusterClient(),
    },
  },
} as unknown as AwaitedProperties<RequestHandlerContext>;

const path = `api/canvas/workpad/find`;

describe('Retrieve ES Fields', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const routerDeps = getMockedRouterDeps();
    initializeESFieldsRoute(routerDeps);

    routeHandler = routerDeps.router.get.mock.calls[0][1];
  });

  it(`returns 200 with fields from existing index/data view`, async () => {
    const index = 'test';
    const mockResults = {
      indices: ['test'],
      fields: {
        '@timestamp': {
          date: {
            type: 'date',
            searchable: true,
            aggregatable: true,
          },
        },
        name: {
          text: {
            type: 'text',
            searchable: true,
            aggregatable: false,
          },
        },
        products: {
          object: {
            type: 'object',
            searchable: false,
            aggregatable: false,
          },
        },
      },
    };
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path,
      query: {
        index,
      },
    });

    const fieldCapsMock = mockRouteContext.core.elasticsearch.client.asCurrentUser
      .fieldCaps as jest.Mock;

    fieldCapsMock.mockResolvedValueOnce(mockResults);

    const response = await routeHandler(
      coreMock.createCustomRequestHandlerContext(mockRouteContext),
      request,
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toMatchInlineSnapshot(`
      Object {
        "@timestamp": "date",
        "name": "string",
        "products": "unsupported",
      }
    `);
  });

  it(`returns 200 with empty object when index/data view has no fields`, async () => {
    const index = 'test';
    const mockResults = { indices: [index], fields: {} };
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path,
      query: {
        index,
      },
    });

    const fieldCapsMock = mockRouteContext.core.elasticsearch.client.asCurrentUser
      .fieldCaps as jest.Mock;

    fieldCapsMock.mockResolvedValueOnce(mockResults);

    const response = await routeHandler(
      coreMock.createCustomRequestHandlerContext(mockRouteContext),
      request,
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toMatchInlineSnapshot('Object {}');
  });

  it(`returns 200 with empty object when index/data view does not have specified field(s)`, async () => {
    const index = 'test';

    const mockResults = {
      indices: [index],
      fields: {},
    };

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path,
      query: {
        index,
        fields: ['foo', 'bar'],
      },
    });

    const fieldCapsMock = mockRouteContext.core.elasticsearch.client.asCurrentUser
      .fieldCaps as jest.Mock;

    fieldCapsMock.mockResolvedValueOnce(mockResults);

    const response = await routeHandler(
      coreMock.createCustomRequestHandlerContext(mockRouteContext),
      request,
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toMatchInlineSnapshot(`Object {}`);
  });

  it(`returns 500 when index does not exist`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path,
      query: {
        index: 'foo',
      },
    });

    const fieldCapsMock = mockRouteContext.core.elasticsearch.client.asCurrentUser
      .fieldCaps as jest.Mock;

    fieldCapsMock.mockRejectedValueOnce(new Error('Index not found'));

    await expect(
      routeHandler(
        coreMock.createCustomRequestHandlerContext(mockRouteContext),
        request,
        kibanaResponseFactory
      )
    ).rejects.toThrowError('Index not found');
  });
});
