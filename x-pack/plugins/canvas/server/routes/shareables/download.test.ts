/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { SHAREABLE_RUNTIME_FILE } from '../../../shareable_runtime/constants';

import { kibanaResponseFactory, RequestHandlerContext, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
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

    jest.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      switch (p) {
        case SHAREABLE_RUNTIME_FILE:
          return content;
        default:
          throw new Error(`unexpected argument to fs.readFileSync: ${p}`);
      }
    });

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path,
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toMatchInlineSnapshot(`"${content}"`);
  });
});
