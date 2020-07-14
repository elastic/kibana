/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { CustomElement } from '../../../types';
import { CUSTOM_ELEMENT_TYPE } from '../../../common/lib/constants';
import { initializeUpdateCustomElementRoute } from './update';
import { kibanaResponseFactory, RequestHandlerContext, RequestHandler } from 'src/core/server';
import {
  savedObjectsClientMock,
  httpServiceMock,
  httpServerMock,
  loggingSystemMock,
} from 'src/core/server/mocks';
import { okResponse } from '../ok_response';

const mockRouteContext = ({
  core: {
    savedObjects: {
      client: savedObjectsClientMock.create(),
    },
  },
} as unknown) as RequestHandlerContext;

const now = new Date();
const nowIso = now.toISOString();

jest.mock('uuid/v4', () => jest.fn().mockReturnValue('123abc'));

type CustomElementPayload = CustomElement & {
  '@timestamp': string;
  '@created': string;
};

const customElement: CustomElementPayload = {
  id: 'my-custom-element',
  name: 'MyCustomElement',
  displayName: 'My Wonderful Custom Element',
  content: 'This is content',
  '@created': '2019-02-08T18:35:23.029Z',
  '@timestamp': '2019-02-08T18:35:23.029Z',
};

describe('PUT custom element', () => {
  let routeHandler: RequestHandler<any, any, any>;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(now);

    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();
    initializeUpdateCustomElementRoute({
      router,
      logger: loggingSystemMock.create().get(),
    });

    routeHandler = router.put.mock.calls[0][1];
  });

  afterEach(() => {
    jest.resetAllMocks();
    clock.restore();
  });

  it(`returns 200 ok when the custom element is updated`, async () => {
    const updatedCustomElement = { name: 'new name' };
    const { id, ...customElementAttributes } = customElement;

    const request = httpServerMock.createKibanaRequest({
      method: 'put',
      path: `api/canvas/custom-element/${id}`,
      params: {
        id,
      },
      body: updatedCustomElement,
    });

    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get.mockResolvedValueOnce({
      id,
      type: CUSTOM_ELEMENT_TYPE,
      attributes: customElementAttributes as any,
      references: [],
    });

    mockRouteContext.core.savedObjects.client = savedObjectsClient;

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(okResponse);
    expect(mockRouteContext.core.savedObjects.client.create).toBeCalledWith(
      CUSTOM_ELEMENT_TYPE,
      {
        ...customElementAttributes,
        ...updatedCustomElement,
        '@timestamp': nowIso,
        '@created': customElement['@created'],
      },
      {
        overwrite: true,
        id,
      }
    );
  });

  it(`returns not found if existing custom element is not found`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'put',
      path: 'api/canvas/custom-element/some-id',
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
      path: 'api/canvas/custom-element/some-id',
      params: {
        id: 'some-id',
      },
      body: {},
    });

    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get.mockResolvedValueOnce({
      id: 'some-id',
      type: CUSTOM_ELEMENT_TYPE,
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
