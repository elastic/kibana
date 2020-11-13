/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory, RequestHandlerContext, RequestHandler } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';
import { ExpressionFunction } from 'src/plugins/expressions/common/expression_functions';
import { initializeGetFunctionsRoute } from './functions';
import { getMockedRouterDeps } from '../test_helpers';
import { API_ROUTE_FUNCTIONS } from '../../../common/lib';
import { functions } from '../../../canvas_plugin_src/functions/server';

const mockRouteContext = {} as RequestHandlerContext;
const routePath = API_ROUTE_FUNCTIONS;

describe('Get list of serverside expression functions', () => {
  let routeHandler: RequestHandler<any, any, any>;
  let mockFuncs: Record<string, ExpressionFunction>;

  beforeEach(() => {
    mockFuncs = {
      demodata: new ExpressionFunction(functions[0]()),
    };

    const routerDeps = getMockedRouterDeps();

    routerDeps.expressions.getFunctions.mockReturnValueOnce(mockFuncs);

    initializeGetFunctionsRoute(routerDeps);

    routeHandler = routerDeps.router.get.mock.calls[0][1];
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it(`returns 200 with list of functions`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: routePath,
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toBe(JSON.stringify(mockFuncs));
  });
});
