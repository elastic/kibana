/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { savedObjectsClientMock, httpServerMock } from 'src/core/server/mocks';
import { CUSTOM_ELEMENT_TYPE } from '../../../common/lib/constants';
import { initializeCreateCustomElementRoute } from './create';
import { kibanaResponseFactory, RequestHandlerContext, RequestHandler } from 'src/core/server';
import { getMockedRouterDeps } from '../test_helpers';

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

describe('POST custom element', () => {
  let routeHandler: RequestHandler<any, any, any>;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(now);

    const routerDeps = getMockedRouterDeps();
    initializeCreateCustomElementRoute(routerDeps);

    routeHandler = routerDeps.router.post.mock.calls[0][1];
  });

  afterEach(() => {
    clock.restore();
  });

  it(`returns 200 when the custom element is created`, async () => {
    const mockCustomElement = {
      displayName: 'My Custom Element',
    };

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: 'api/canvas/custom-element',
      body: mockCustomElement,
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ ok: true });
    expect(mockRouteContext.core.savedObjects.client.create).toBeCalledWith(
      CUSTOM_ELEMENT_TYPE,
      {
        ...mockCustomElement,
        '@timestamp': nowIso,
        '@created': nowIso,
      },
      {
        id: `custom-element-${mockedUUID}`,
      }
    );
  });

  it(`returns bad request if create is unsuccessful`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: 'api/canvas/custom-element',
      body: {},
    });

    (mockRouteContext.core.savedObjects.client.create as jest.Mock).mockImplementation(() => {
      throw mockRouteContext.core.savedObjects.client.errors.createBadRequestError('bad request');
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(400);
  });
});
