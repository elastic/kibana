/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import {
  savedObjectsClientMock,
  httpServiceMock,
  httpServerMock,
  loggingServiceMock,
} from 'src/core/server/mocks';
import { CANVAS_TYPE } from '../../../../../legacy/plugins/canvas/common/lib/constants';
import { initializeCreateWorkpadRoute } from './create';
import {
  IRouter,
  kibanaResponseFactory,
  RequestHandlerContext,
  RequestHandler,
} from 'src/core/server';

const mockRouteContext = ({
  core: {
    savedObjects: {
      client: savedObjectsClientMock.create(),
    },
  },
} as unknown) as RequestHandlerContext;

const mockedUUID = '123abc';
const now = new Date();
const nowIso = now.toISOString();

jest.mock('uuid/v4', () => jest.fn().mockReturnValue('123abc'));

describe('POST workpad', () => {
  let routeHandler: RequestHandler<any, any, any>;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(now);

    const httpService = httpServiceMock.createSetupContract();

    const router = httpService.createRouter('') as jest.Mocked<IRouter>;
    initializeCreateWorkpadRoute({
      router,
      logger: loggingServiceMock.create().get(),
    });

    routeHandler = router.post.mock.calls[0][1];
  });

  afterEach(() => {
    clock.restore();
  });

  it(`returns 200 when the workpad is created`, async () => {
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
    expect(response.payload).toEqual({ ok: true });
    expect(mockRouteContext.core.savedObjects.client.create).toBeCalledWith(
      CANVAS_TYPE,
      {
        ...mockWorkpad,
        '@timestamp': nowIso,
        '@created': nowIso,
      },
      {
        id: `workpad-${mockedUUID}`,
      }
    );
  });

  it(`returns bad request if create is unsuccessful`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: 'api/canvas/workpad',
      body: {},
    });

    (mockRouteContext.core.savedObjects.client.create as jest.Mock).mockImplementation(() => {
      throw mockRouteContext.core.savedObjects.client.errors.createBadRequestError('bad request');
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(400);
  });
});
