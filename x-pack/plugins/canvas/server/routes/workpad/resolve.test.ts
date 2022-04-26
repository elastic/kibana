/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AwaitedProperties } from '@kbn/utility-types';
import { CANVAS_TYPE } from '../../../common/lib/constants';
import { initializeResolveWorkpadRoute } from './resolve';
import { kibanaResponseFactory, RequestHandler } from '@kbn/core/server';
import { savedObjectsClientMock, httpServerMock, coreMock } from '@kbn/core/server/mocks';
import { workpadWithGroupAsElement } from '../../../__fixtures__/workpads';
import { CanvasWorkpad } from '../../../types';
import { getMockedRouterDeps } from '../test_helpers';
import { workpadRouteContextMock, MockWorkpadRouteContext } from '../../mocks';

const mockRouteContext = {
  canvas: workpadRouteContextMock.create(),
} as unknown as AwaitedProperties<MockWorkpadRouteContext>;

describe('RESOLVE workpad', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const routerDeps = getMockedRouterDeps();
    initializeResolveWorkpadRoute(routerDeps);

    routeHandler = routerDeps.router.get.mock.calls[0][1];
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it(`returns 200 when the workpad is found`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: 'api/canvas/workpad/resolve/123',
      params: {
        id: '123',
      },
    });

    const outcome = 'aliasMatch';
    const aliasId = 'alias-id';

    mockRouteContext.canvas.workpad.resolve.mockResolvedValue({
      saved_object: {
        id: '123',
        type: CANVAS_TYPE,
        attributes: { foo: true },
        references: [],
      },
      outcome,
      alias_target_id: aliasId,
    });

    const response = await routeHandler(
      coreMock.createCustomRequestHandlerContext(mockRouteContext),
      request,
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toMatchInlineSnapshot(`
      Object {
        "aliasId": "alias-id",
        "outcome": "aliasMatch",
        "workpad": Object {
          "foo": true,
          "id": "123",
        },
      }
    `);

    expect(mockRouteContext.canvas.workpad.resolve.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "123",
        ],
      ]
    `);
  });

  it('corrects elements that should be groups', async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: 'api/canvas/workpad/resolve/123',
      params: {
        id: '123',
      },
    });

    mockRouteContext.canvas.workpad.resolve.mockResolvedValue({
      saved_object: {
        id: '123',
        type: CANVAS_TYPE,
        attributes: workpadWithGroupAsElement as any,
        references: [],
      },
      outcome: 'exactMatch',
    });

    const response = await routeHandler(
      coreMock.createCustomRequestHandlerContext(mockRouteContext),
      request,
      kibanaResponseFactory
    );
    const workpad = response.payload.workpad as CanvasWorkpad;

    expect(response.status).toBe(200);
    expect(workpad).not.toBeUndefined();

    expect(workpad.pages[0].elements.length).toBe(1);
    expect(workpad.pages[0].groups.length).toBe(1);
  });

  it('returns 404 if the workpad is not found', async () => {
    const id = '123';
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: 'api/canvas/workpad/resolve/123',
      params: {
        id,
      },
    });

    const savedObjectsClient = savedObjectsClientMock.create();
    mockRouteContext.canvas.workpad.resolve.mockImplementation(() => {
      throw savedObjectsClient.errors.createGenericNotFoundError(CANVAS_TYPE, id);
    });

    const response = await routeHandler(
      coreMock.createCustomRequestHandlerContext(mockRouteContext),
      request,
      kibanaResponseFactory
    );

    expect(response.payload).toMatchInlineSnapshot(`
      Object {
        "error": "Not Found",
        "message": "Saved object [canvas-workpad/123] not found",
        "statusCode": 404,
      }
    `);
  });
});
