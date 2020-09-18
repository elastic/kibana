/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import { when } from 'jest-when';
import { SHAREABLE_RUNTIME_FILE } from '../../../shareable_runtime/constants';

import { kibanaResponseFactory, RequestHandlerContext, RequestHandler } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';
import { initializeDownloadShareableWorkpadRoute } from './download';
import { getMockedRouterDeps } from '../test_helpers';

const mockRouteContext = {} as RequestHandlerContext;
const path = `api/canvas/workpad/find`;

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
    const content = 'Canvas shareable runtime';
    const spy = jest.spyOn(fs, 'readFileSync').mockImplementation();
    when(spy).calledWith(SHAREABLE_RUNTIME_FILE).mockReturnValue(content);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path,
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toMatchInlineSnapshot(`"${content}"`);
  });
});
