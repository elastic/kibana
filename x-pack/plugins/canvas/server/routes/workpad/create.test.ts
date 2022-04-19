/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, httpServerMock } from '@kbn/core/server/mocks';
import { workpadRouteContextMock, MockWorkpadRouteContext } from '../../mocks';
import { initializeCreateWorkpadRoute } from './create';
import { kibanaResponseFactory, RequestHandler } from '@kbn/core/server';
import { getMockedRouterDeps } from '../test_helpers';

let mockRouteContext = {
  core: {
    savedObjects: {
      client: savedObjectsClientMock.create(),
    },
  },
  canvas: workpadRouteContextMock.create(),
} as unknown as MockWorkpadRouteContext;

jest.mock('uuid/v4', () => jest.fn().mockReturnValue('123abc'));

describe('POST workpad', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    mockRouteContext = {
      core: {
        savedObjects: {
          client: savedObjectsClientMock.create(),
        },
      },
      canvas: workpadRouteContextMock.create(),
    } as unknown as MockWorkpadRouteContext;

    const routerDeps = getMockedRouterDeps();
    initializeCreateWorkpadRoute(routerDeps);

    routeHandler = routerDeps.router.post.mock.calls[0][1];
  });

  it(`returns 200 when the workpad is created`, async () => {
    const id = 'my-id';
    mockRouteContext.canvas.workpad.create.mockResolvedValue({
      id,
    });

    const mockWorkpad = {
      pages: [],
    };

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: 'api/canvas/workpad',
      body: mockWorkpad,
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ ok: true, id });
    expect(mockRouteContext.canvas.workpad.create).toBeCalledWith(mockWorkpad);
  });

  it(`returns bad request if create is unsuccessful`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: 'api/canvas/workpad',
      body: {},
    });

    mockRouteContext.canvas.workpad.create.mockImplementation(() => {
      throw mockRouteContext.core.savedObjects.client.errors.createBadRequestError('bad request');
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(400);
  });

  it(`returns 200 when a template is cloned`, async () => {
    const cloneFromTemplateBody = {
      templateId: 'template-id',
    };

    const mockTemplateResponse = {
      attributes: {
        id: 'template-id',
        template: {
          pages: [],
        },
      },
    };

    const id = 'my-id';
    mockRouteContext.canvas.workpad.create.mockResolvedValue({
      id,
    });

    (mockRouteContext.core.savedObjects.client.get as jest.Mock).mockResolvedValue(
      mockTemplateResponse
    );

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: 'api/canvas/workpad',
      body: cloneFromTemplateBody,
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ ok: true, id });
    expect(mockRouteContext.canvas.workpad.create).toBeCalledWith(
      mockTemplateResponse.attributes.template
    );
  });
});
