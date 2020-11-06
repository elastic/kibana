/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory, RequestHandlerContext } from '../../../../../../src/core/server';
import { httpServerMock } from '../../../../../../src/core/server/mocks';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineCreateApiKeyRoutes } from './create';

jest.mock('../licensed_route_handler');

const createLicensedRouteHandlerMock = createLicensedRouteHandler as jest.Mock;
createLicensedRouteHandlerMock.mockImplementation((handler) => handler);

const contextMock = ({} as unknown) as RequestHandlerContext;

describe('defineCreateApiKeyRoutes', () => {
  beforeEach(() => {
    createLicensedRouteHandlerMock.mockClear();
  });

  test('creates licensed route handler', () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    defineCreateApiKeyRoutes(mockRouteDefinitionParams);
    expect(createLicensedRouteHandlerMock).toHaveBeenCalledTimes(1);
  });

  test('validates request body', () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    defineCreateApiKeyRoutes(mockRouteDefinitionParams);
    const [[route]] = mockRouteDefinitionParams.router.post.mock.calls;
    expect(() => (route.validate as any).body.validate({})).toThrow(
      '[name]: expected value of type [string] but got [undefined]'
    );
  });

  test('creates API key', async () => {
    const createAPIKeyResult = {
      id: 'ID',
      name: 'NAME',
      api_key: 'API_KEY',
    };
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.authc.createAPIKey.mockResolvedValue(createAPIKeyResult);
    defineCreateApiKeyRoutes(mockRouteDefinitionParams);
    const [[, handler]] = mockRouteDefinitionParams.router.post.mock.calls;

    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/internal/security/api_key',
      body: {},
    });
    const response = await handler(contextMock, mockRequest, kibanaResponseFactory);
    expect(mockRouteDefinitionParams.authc.createAPIKey).toHaveBeenCalledWith(
      mockRequest,
      mockRequest.body
    );
    expect(response.status).toBe(200);
    expect(response.payload).toEqual(createAPIKeyResult);
  });

  test('returns bad request if api keys are not available', async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.authc.createAPIKey.mockResolvedValue(null);
    defineCreateApiKeyRoutes(mockRouteDefinitionParams);
    const [[, handler]] = mockRouteDefinitionParams.router.post.mock.calls;

    const response = await handler(
      contextMock,
      httpServerMock.createKibanaRequest({
        method: 'post',
        path: '/internal/security/api_key',
        body: {},
      }),
      kibanaResponseFactory
    );
    expect(response.status).toBe(400);
    expect(response.payload).toEqual({ message: 'API Keys are not available' });
  });

  test('returns bad request if api key could not be created', async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.authc.createAPIKey.mockRejectedValue(new Error('Error'));
    defineCreateApiKeyRoutes(mockRouteDefinitionParams);
    const [[, handler]] = mockRouteDefinitionParams.router.post.mock.calls;

    const response = await handler(
      contextMock,
      httpServerMock.createKibanaRequest({
        method: 'post',
        path: '/internal/security/api_key',
        body: {},
      }),
      kibanaResponseFactory
    );
    expect(response.status).toBe(500);
  });
});
