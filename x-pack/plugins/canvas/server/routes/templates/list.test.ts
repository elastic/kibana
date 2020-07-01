/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest } from 'boom';
import { initializeListTemplates } from './list';
import {
  IRouter,
  kibanaResponseFactory,
  RequestHandlerContext,
  RequestHandler,
} from 'src/core/server';
import {
  savedObjectsClientMock,
  httpServiceMock,
  httpServerMock,
  loggingSystemMock,
} from 'src/core/server/mocks';

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
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter() as jest.Mocked<IRouter>;
    initializeListTemplates({
      router,
      logger: loggingSystemMock.create().get(),
    });

    routeHandler = router.get.mock.calls[0][1];
  });

  it(`returns 200 with the found templates`, async () => {
    const template1 = { name: 'template1' };
    const template2 = { name: 'template2' };

    const mockResults = {
      total: 2,
      saved_objects: [
        { id: 1, attributes: template1 },
        { id: 2, attributes: template2 },
      ],
    };

    const findMock = mockRouteContext.core.savedObjects.client.find as jest.Mock;

    findMock.mockResolvedValueOnce(mockResults);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `api/canvas/templates/list`,
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);
    expect(response.status).toBe(200);

    expect(response.payload).toMatchInlineSnapshot(`
      Object {
        "templates": Array [
          Object {
            "name": "template1",
          },
          Object {
            "name": "template2",
          },
        ],
      }
    `);
  });

  it(`returns appropriate error on error`, async () => {
    (mockRouteContext.core.savedObjects.client.find as jest.Mock).mockImplementationOnce(() => {
      throw badRequest('generic error');
    });

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `api/canvas/templates/list`,
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(400);
    expect(response.payload).toMatchInlineSnapshot(`
      Object {
        "error": "Bad Request",
        "message": "generic error",
        "statusCode": 400,
      }
    `);
  });
});
