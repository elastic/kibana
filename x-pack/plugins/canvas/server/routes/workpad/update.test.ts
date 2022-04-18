/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { CANVAS_TYPE } from '../../../common/lib/constants';
import { initializeUpdateWorkpadRoute, initializeUpdateWorkpadAssetsRoute } from './update';
import { kibanaResponseFactory, RequestHandler } from '@kbn/core/server';
import { savedObjectsClientMock, httpServerMock } from '@kbn/core/server/mocks';
import { workpads } from '../../../__fixtures__/workpads';
import { okResponse } from '../ok_response';
import { getMockedRouterDeps } from '../test_helpers';
import { workpadRouteContextMock, MockWorkpadRouteContext } from '../../mocks';

const mockRouteContext = {
  core: {
    savedObjects: {
      client: savedObjectsClientMock.create(),
    },
  },
  canvas: workpadRouteContextMock.create(),
} as unknown as MockWorkpadRouteContext;

const workpad = workpads[0];
const now = new Date();

jest.mock('uuid/v4', () => jest.fn().mockReturnValue('123abc'));

describe('PUT workpad', () => {
  let routeHandler: RequestHandler<any, any, any>;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(now);

    const routerDeps = getMockedRouterDeps();
    initializeUpdateWorkpadRoute(routerDeps);

    routeHandler = routerDeps.router.put.mock.calls[0][1];
  });

  afterEach(() => {
    jest.resetAllMocks();
    clock.restore();
  });

  it(`returns 200 ok when the workpad is updated`, async () => {
    const updatedWorkpad = { name: 'new name' };
    const { id } = workpad;

    const request = httpServerMock.createKibanaRequest({
      method: 'put',
      path: `api/canvas/workpad/${id}`,
      params: {
        id,
      },
      body: updatedWorkpad,
    });

    mockRouteContext.canvas.workpad.update.mockResolvedValue(true);

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(okResponse);
    expect(mockRouteContext.canvas.workpad.update).toBeCalledWith(id, updatedWorkpad);
  });

  it(`returns not found if existing workpad is not found`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'put',
      path: 'api/canvas/workpad/some-id',
      params: {
        id: 'not-found',
      },
      body: {},
    });

    mockRouteContext.canvas.workpad.update.mockImplementationOnce(() => {
      throw mockRouteContext.core.savedObjects.client.errors.createGenericNotFoundError(
        'not found'
      );
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(404);
  });

  it(`returns bad request if the write fails`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'put',
      path: 'api/canvas/workpad/some-id',
      params: {
        id: 'some-id',
      },
      body: {},
    });

    mockRouteContext.canvas.workpad.update.mockImplementationOnce(() => {
      throw mockRouteContext.core.savedObjects.client.errors.createBadRequestError('bad request');
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(400);
  });
});

describe('update assets', () => {
  let routeHandler: RequestHandler<any, any, any>;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(now);

    const routerDeps = getMockedRouterDeps();
    initializeUpdateWorkpadAssetsRoute(routerDeps);

    routeHandler = routerDeps.router.put.mock.calls[0][1];
  });

  afterEach(() => {
    clock.restore();
  });

  it('updates assets', async () => {
    const { id, ...attributes } = workpad;
    const assets = {
      'asset-1': {
        '@created': new Date().toISOString(),
        id: 'asset-1',
        type: 'asset',
        value: 'some-url-encoded-asset',
      },
      'asset-2': {
        '@created': new Date().toISOString(),
        id: 'asset-2',
        type: 'asset',
        value: 'some-other asset',
      },
    };

    const request = httpServerMock.createKibanaRequest({
      method: 'put',
      path: 'api/canvas/workpad-assets/some-id',
      params: {
        id,
      },
      body: assets,
    });

    mockRouteContext.canvas.workpad.update.mockResolvedValueOnce({
      id,
      type: CANVAS_TYPE,
      attributes: attributes as any,
      references: [],
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);
    expect(response.status).toBe(200);

    expect(mockRouteContext.canvas.workpad.update).toBeCalledWith(id, {
      assets,
    });
  });
});
