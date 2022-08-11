/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HttpResources,
  HttpResourcesRequestHandler,
  RequestHandler,
  RouteConfig,
} from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpResourcesMock, httpServerMock } from '@kbn/core/server/mocks';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { SecurityLicense, SecurityLicenseFeatures } from '../../../common/licensing';
import type { AuthenticationProvider } from '../../../common/model';
import type { ConfigType } from '../../config';
import type { Session } from '../../session_management';
import { sessionMock } from '../../session_management/session.mock';
import type { SecurityRequestHandlerContext, SecurityRouter } from '../../types';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineAccessAgreementRoutes } from './access_agreement';

describe('Access agreement view routes', () => {
  let httpResources: jest.Mocked<HttpResources>;
  let router: jest.Mocked<SecurityRouter>;
  let config: ConfigType;
  let session: jest.Mocked<PublicMethodsOf<Session>>;
  let license: jest.Mocked<SecurityLicense>;
  let mockContext: SecurityRequestHandlerContext;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;
    httpResources = routeParamsMock.httpResources;
    config = routeParamsMock.config;
    license = routeParamsMock.license;

    session = sessionMock.create();
    routeParamsMock.getSession.mockReturnValue(session);

    license.getFeatures.mockReturnValue({
      allowAccessAgreement: true,
    } as SecurityLicenseFeatures);

    mockContext = {
      licensing: {
        license: { check: jest.fn().mockReturnValue({ check: 'valid' }) },
      },
    } as unknown as SecurityRequestHandlerContext;

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
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext, 'get'>;
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
