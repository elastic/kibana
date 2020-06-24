/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('archiver');

const archiver = require('archiver') as jest.Mock;
import { kibanaResponseFactory, RequestHandlerContext, RequestHandler } from 'src/core/server';
import { httpServiceMock, httpServerMock, loggingSystemMock } from 'src/core/server/mocks';
import { initializeZipShareableWorkpadRoute } from './zip';
import { API_ROUTE_SHAREABLE_ZIP } from '../../../common/lib';
import {
  SHAREABLE_RUNTIME_FILE,
  SHAREABLE_RUNTIME_SRC,
  SHAREABLE_RUNTIME_NAME,
} from '../../../shareable_runtime/constants';

const mockRouteContext = {} as RequestHandlerContext;
const mockWorkpad = {};
const routePath = API_ROUTE_SHAREABLE_ZIP;

describe('Zips Canvas shareables runtime together with workpad', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();
    initializeZipShareableWorkpadRoute({
      router,
      logger: loggingSystemMock.create().get(),
    });

    routeHandler = router.post.mock.calls[0][1];
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it(`returns 200 with zip file with runtime and workpad`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: routePath,
      body: mockWorkpad,
    });

    const mockArchive = {
      append: jest.fn(),
      file: jest.fn(),
      finalize: jest.fn(),
    };

    archiver.mockReturnValueOnce(mockArchive);

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toBe(mockArchive);
    expect(mockArchive.append).toHaveBeenCalledWith(JSON.stringify(mockWorkpad), {
      name: 'workpad.json',
    });
    expect(mockArchive.file).toHaveBeenCalledTimes(2);
    expect(mockArchive.file).nthCalledWith(1, `${SHAREABLE_RUNTIME_SRC}/template.html`, {
      name: 'index.html',
    });
    expect(mockArchive.file).nthCalledWith(2, SHAREABLE_RUNTIME_FILE, {
      name: `${SHAREABLE_RUNTIME_NAME}.js`,
    });
    expect(mockArchive.finalize).toBeCalled();
  });
});
