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
  RequestHandlerContext,
} from '../../../../../../src/core/server';
import { SecurityLicense, SecurityLicenseFeatures } from '../../../common/licensing';
import { AuthenticationProvider } from '../../../common/types';
import { ConfigType } from '../../config';
import { Session } from '../../session_management';
import { defineAccessAgreementRoutes } from './access_agreement';

import { httpResourcesMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { sessionMock } from '../../session_management/session.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Access agreement view routes', () => {
  let httpResources: jest.Mocked<HttpResources>;
  let router: jest.Mocked<IRouter>;
  let config: ConfigType;
  let session: jest.Mocked<PublicMethodsOf<Session>>;
  let license: jest.Mocked<SecurityLicense>;
  let mockContext: RequestHandlerContext;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;
    httpResources = routeParamsMock.httpResources;
    session = routeParamsMock.session;
    config = routeParamsMock.config;
    license = routeParamsMock.license;

    license.getFeatures.mockReturnValue({
      allowAccessAgreement: true,
    } as SecurityLicenseFeatures);

    mockContext = ({
      licensing: {
        license: { check: jest.fn().mockReturnValue({ check: 'valid' }) },
      },
    } as unknown) as RequestHandlerContext;

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

    it('does not render view if current license does not allow access agreement.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const responseFactory = httpResourcesMock.createResponseFactory();

      license.getFeatures.mockReturnValue({
        allowAccessAgreement: false,
      } as SecurityLicenseFeatures);

      await routeHandler(mockContext, request, responseFactory);

      expect(responseFactory.renderCoreApp).not.toHaveBeenCalledWith();
      expect(responseFactory.forbidden).toHaveBeenCalledTimes(1);
    });

    it('renders view.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const responseFactory = httpResourcesMock.createResponseFactory();

      await routeHandler(mockContext, request, responseFactory);

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

    it('returns `403` if current license does not allow access agreement.', async () => {
      const request = httpServerMock.createKibanaRequest();

      license.getFeatures.mockReturnValue({
        allowAccessAgreement: false,
      } as SecurityLicenseFeatures);

      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
        status: 403,
        payload: { message: `Current license doesn't support access agreement.` },
        options: { body: { message: `Current license doesn't support access agreement.` } },
      });
    });

    it('returns empty `accessAgreement` if session info is not available.', async () => {
      const request = httpServerMock.createKibanaRequest();

      session.get.mockResolvedValue(null);

      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
        options: { body: { accessAgreement: '' } },
        payload: { accessAgreement: '' },
        status: 200,
      });
    });

    it('returns non-empty `accessAgreement` only if it is configured.', async () => {
      const request = httpServerMock.createKibanaRequest();

      config.authc = routeDefinitionParamsMock.create({
        authc: {
          providers: {
            basic: { basic1: { order: 0 } },
            saml: {
              saml1: {
                order: 1,
                realm: 'realm1',
                accessAgreement: { message: 'Some access agreement' },
              },
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
        session.get.mockResolvedValue(sessionMock.createValue({ provider: sessionProvider }));

        await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
          options: { body: { accessAgreement: expectedAccessAgreement } },
          payload: { accessAgreement: expectedAccessAgreement },
          status: 200,
        });
      }
    });
  });
});
