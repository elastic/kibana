/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { CANVAS_TYPE } from '../../../../../legacy/plugins/canvas/common/lib/constants';
import { initializeUpdateWorkpadRoute, initializeUpdateWorkpadAssetsRoute } from './update';
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
  loggingServiceMock,
} from 'src/core/server/mocks';
import { workpads } from '../../../../../legacy/plugins/canvas/__tests__/fixtures/workpads';
import { okResponse } from '../ok_response';

const mockRouteContext = ({
  core: {
    savedObjects: {
      client: savedObjectsClientMock.create(),
    },
  },
} as unknown) as RequestHandlerContext;

const workpad = workpads[0];
const now = new Date();
const nowIso = now.toISOString();

jest.mock('uuid/v4', () => jest.fn().mockReturnValue('123abc'));

describe('PUT workpad', () => {
  let routeHandler: RequestHandler<any, any, any>;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(now);

    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter('') as jest.Mocked<IRouter>;
    initializeUpdateWorkpadRoute({
      router,
      logger: loggingServiceMock.create().get(),
    });

    routeHandler = router.put.mock.calls[0][1];
  });

  afterEach(() => {
    jest.resetAllMocks();
    clock.restore();
  });

  it(`returns 200 ok when the workpad is updated`, async () => {
    const updatedWorkpad = { name: 'new name' };
    const { id, ...workpadAttributes } = workpad;

    const request = httpServerMock.createKibanaRequest({
      method: 'put',
      path: `api/canvas/workpad/${id}`,
      params: {
        id,
      },
      body: updatedWorkpad,
    });

    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get.mockResolvedValueOnce({
      id,
      type: CANVAS_TYPE,
      attributes: workpadAttributes as any,
      references: [],
    });

    mockRouteContext.core.savedObjects.client = savedObjectsClient;

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(okResponse);
    expect(mockRouteContext.core.savedObjects.client.create).toBeCalledWith(
      CANVAS_TYPE,
      {
        ...workpadAttributes,
        ...updatedWorkpad,
        '@timestamp': nowIso,
        '@created': workpad['@created'],
      },
      {
        overwrite: true,
        id,
      }
    );
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

    (mockRouteContext.core.savedObjects.client.get as jest.Mock).mockImplementationOnce(() => {
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

    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get.mockResolvedValueOnce({
      id: 'some-id',
      type: CANVAS_TYPE,
      attributes: {},
      references: [],
    });

    mockRouteContext.core.savedObjects.client = savedObjectsClient;

    (mockRouteContext.core.savedObjects.client.create as jest.Mock).mockImplementationOnce(() => {
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
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter('') as jest.Mocked<IRouter>;
    initializeUpdateWorkpadAssetsRoute({
      router,
      logger: loggingServiceMock.create().get(),
    });

    routeHandler = router.put.mock.calls[0][1];
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

    (mockRouteContext.core.savedObjects.client.get as jest.Mock).mockResolvedValueOnce({
      id,
      type: CANVAS_TYPE,
      attributes: attributes as any,
      references: [],
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);
    expect(response.status).toBe(200);

    expect(mockRouteContext.core.savedObjects.client.create).toBeCalledWith(
      CANVAS_TYPE,
      {
        ...attributes,
        '@timestamp': nowIso,
        assets,
      },
      {
        id,
        overwrite: true,
      }
    );
  });
});
