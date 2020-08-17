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
  loggingSystemMock,
} from 'src/core/server/mocks';
import { CANVAS_TYPE } from '../../../common/lib/constants';
import { initializeCreateWorkpadRoute } from './create';
import { kibanaResponseFactory, RequestHandlerContext, RequestHandler } from 'src/core/server';

let mockRouteContext = ({
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
    mockRouteContext = ({
      core: {
        savedObjects: {
          client: savedObjectsClientMock.create(),
        },
      },
    } as unknown) as RequestHandlerContext;

    clock = sinon.useFakeTimers(now);

    const httpService = httpServiceMock.createSetupContract();

    const router = httpService.createRouter();
    initializeCreateWorkpadRoute({
      router,
      logger: loggingSystemMock.create().get(),
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
    expect(response.payload).toEqual({ ok: true, id: `workpad-${mockedUUID}` });
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
    expect(response.payload).toEqual({ ok: true, id: `workpad-${mockedUUID}` });
    expect(mockRouteContext.core.savedObjects.client.create).toBeCalledWith(
      CANVAS_TYPE,
      {
        ...mockTemplateResponse.attributes.template,
        '@timestamp': nowIso,
        '@created': nowIso,
      },
      {
        id: `workpad-${mockedUUID}`,
      }
    );
  });
});
