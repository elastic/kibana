/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('fs');

import fs from 'fs';
import { kibanaResponseFactory, RequestHandlerContext, RequestHandler } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';
import { initializeDownloadShareableWorkpadRoute } from './download';
import { getMockedRouterDeps } from '../test_helpers';

const mockRouteContext = {} as RequestHandlerContext;
const path = `api/canvas/workpad/find`;
const mockRuntime = 'Canvas shareable runtime';

describe('Download Canvas shareables runtime', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const routerDeps = getMockedRouterDeps();
    initializeDownloadShareableWorkpadRoute(routerDeps);

    routeHandler = routerDeps.router.get.mock.calls[0][1];
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it(`returns 200 with canvas shareables runtime`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path,
    });

    const readFileSyncMock = fs.readFileSync as jest.Mock;
    readFileSyncMock.mockReturnValueOnce(mockRuntime);

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toMatchInlineSnapshot(`"Canvas shareable runtime"`);
  });
});
