/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RequestHandler,
  RouteConfig,
  kibanaResponseFactory,
  IRouter,
  HttpResources,
  HttpResourcesRequestHandler,
} from '../../../../../../src/core/server';
import { AuthenticationProvider } from '../../../common/types';
import { ConfigType } from '../../config';
import { defineAccessAgreementRoutes } from './access_agreement';

import {
  coreMock,
  httpResourcesMock,
  httpServerMock,
} from '../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../index.mock';
import { Authentication } from '../../authentication';

describe('Access agreement view routes', () => {
  let httpResources: jest.Mocked<HttpResources>;
  let router: jest.Mocked<IRouter>;
  let config: ConfigType;
  let authc: jest.Mocked<Authentication>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;
    httpResources = routeParamsMock.httpResources;
    authc = routeParamsMock.authc;
    config = routeParamsMock.config;

    defineAccessAgreementRoutes(routeParamsMock);
  });

  describe('View route', () => {
    let routeHandler: HttpResourcesRequestHandler<any, any, any>;
    let routeConfig: RouteConfig<any, any, any, 'get'>;
    beforeEach(() => {
      const [viewRouteConfig, viewRouteHandler] = httpResources.register.mock.calls.find(
        ([{ path }]) => path === '/security/access_agreement'
      )!;

      routeConfig = viewRouteConfig;
      routeHandler = viewRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toBeUndefined();
      expect(routeConfig.validate).toBe(false);
    });

    it('renders view.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();
      const responseFactory = httpResourcesMock.createResponseFactory();

      await routeHandler({ core: contextMock } as any, request, responseFactory);

      expect(responseFactory.renderCoreApp).toHaveBeenCalledWith();
    });
  });

  describe('Access agreement state route', () => {
    let routeHandler: RequestHandler<any, any, any, 'get'>;
    let routeConfig: RouteConfig<any, any, any, 'get'>;
    beforeEach(() => {
      const [loginStateRouteConfig, loginStateRouteHandler] = router.get.mock.calls.find(
        ([{ path }]) => path === '/internal/security/access_agreement/state'
      )!;

      routeConfig = loginStateRouteConfig;
      routeHandler = loginStateRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toBeUndefined();
      expect(routeConfig.validate).toBe(false);
    });

    it('returns empty `accessAgreement` if session info is not available.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      authc.getSessionInfo.mockResolvedValue(null);

      await expect(
        routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
      ).resolves.toEqual({
        options: { body: { accessAgreement: '' } },
        payload: { accessAgreement: '' },
        status: 200,
      });
    });

    it('returns non-empty `accessAgreement` only if it is configured.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      config.authc = routeDefinitionParamsMock.create({
        authc: {
          providers: {
            basic: { basic1: { order: 0 } },
            saml: {
              saml1: { order: 1, realm: 'realm1', accessAgreement: 'Some access agreement' },
            },
          },
        },
      }).config.authc;

      const cases: Array<[AuthenticationProvider, string]> = [
        [{ type: 'basic', name: 'basic1' }, ''],
        [{ type: 'saml', name: 'saml1' }, 'Some access agreement'],
        [{ type: 'unknown-type', name: 'unknown-name' }, ''],
      ];

      for (const [sessionProvider, expectedAccessAgreement] of cases) {
        authc.getSessionInfo.mockResolvedValue({
          now: Date.now(),
          idleTimeoutExpiration: null,
          lifespanExpiration: null,
          provider: sessionProvider,
        });

        await expect(
          routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
        ).resolves.toEqual({
          options: { body: { accessAgreement: expectedAccessAgreement } },
          payload: { accessAgreement: expectedAccessAgreement },
          status: 200,
        });
      }
    });
  });
});
