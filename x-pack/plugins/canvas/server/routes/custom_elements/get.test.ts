/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CUSTOM_ELEMENT_TYPE } from '../../../common/lib/constants';
import { initializeGetCustomElementRoute } from './get';
import { kibanaResponseFactory, RequestHandlerContext, RequestHandler } from 'src/core/server';
import {
  savedObjectsClientMock,
  httpServiceMock,
  httpServerMock,
  loggingServiceMock,
} from 'src/core/server/mocks';

const mockRouteContext = ({
  core: {
    savedObjects: {
      client: savedObjectsClientMock.create(),
    },
  },
} as unknown) as RequestHandlerContext;

describe('GET custom element', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();
    initializeGetCustomElementRoute({
      router,
      logger: loggingServiceMock.create().get(),
    });

    routeHandler = router.get.mock.calls[0][1];
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
