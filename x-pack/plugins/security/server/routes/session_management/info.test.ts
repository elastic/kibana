/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler, RouteConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { SESSION_EXPIRATION_WARNING_MS } from '../../../common/constants';
import type { Session } from '../../session_management';
import { sessionMock } from '../../session_management/session.mock';
import type { SecurityRequestHandlerContext, SecurityRouter } from '../../types';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineSessionInfoRoutes } from './info';

describe('Info session routes', () => {
  let router: jest.Mocked<SecurityRouter>;
  let session: jest.Mocked<PublicMethodsOf<Session>>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;

    session = sessionMock.create();
    routeParamsMock.getSession.mockReturnValue(session);

    defineSessionInfoRoutes(routeParamsMock);
  });

  describe('session info', () => {
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [extendRouteConfig, extendRouteHandler] = router.get.mock.calls.find(
        ([{ path }]) => path === '/internal/security/session'
      )!;

      routeConfig = extendRouteConfig;
      routeHandler = extendRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toBeUndefined();
      expect(routeConfig.validate).toBe(false);
    });

    it('returns 500 if unhandled exception is thrown when session is retrieved.', async () => {
      const unhandledException = new Error('Something went wrong.');
      session.get.mockRejectedValue(unhandledException);

      const request = httpServerMock.createKibanaRequest();
      await expect(
        routeHandler({} as unknown as SecurityRequestHandlerContext, request, kibanaResponseFactory)
      ).rejects.toThrowError(unhandledException);

      expect(session.get).toHaveBeenCalledWith(request);
    });

    it('returns session info.', async () => {
      const now = 1000;
      const dateSpy = jest.spyOn(Date, 'now');
      dateSpy.mockReturnValue(now);

      const assertions = [
        [
          {
            idleTimeoutExpiration: 100 + now,
            lifespanExpiration: 200 + SESSION_EXPIRATION_WARNING_MS + now,
          },
          {
            canBeExtended: true,
            expiresInMs: 100,
          },
        ],
        [
          {
            idleTimeoutExpiration: 100 + now,
            lifespanExpiration: 200 + now,
          },
          {
            canBeExtended: false,
            expiresInMs: 100,
          },
        ],
        [
          {
            idleTimeoutExpiration: 200 + now,
            lifespanExpiration: 100 + now,
          },
          {
            canBeExtended: false,
            expiresInMs: 100,
          },
        ],
        [
          {
            idleTimeoutExpiration: null,
            lifespanExpiration: 100 + now,
          },
          {
            canBeExtended: false,
            expiresInMs: 100,
          },
        ],
        [
          {
            idleTimeoutExpiration: 100 + now,
            lifespanExpiration: null,
          },
          {
            canBeExtended: true,
            expiresInMs: 100,
          },
        ],
        [
          {
            idleTimeoutExpiration: null,
            lifespanExpiration: null,
          },
          {
            canBeExtended: false,
            expiresInMs: null,
          },
        ],
      ];

      for (const [sessionInfo, expected] of assertions) {
        session.get.mockResolvedValue(sessionMock.createValue(sessionInfo));

        const expectedBody = {
          canBeExtended: expected.canBeExtended,
          expiresInMs: expected.expiresInMs,
          provider: { type: 'basic', name: 'basic1' },
        };

        await expect(
          routeHandler(
            {} as unknown as SecurityRequestHandlerContext,
            httpServerMock.createKibanaRequest(),
            kibanaResponseFactory
          )
        ).resolves.toEqual({
          status: 200,
          payload: expectedBody,
          options: { body: expectedBody },
        });
      }
    });

    it('returns empty response if session is not available.', async () => {
      session.get.mockResolvedValue(null);

      await expect(
        routeHandler(
          {} as unknown as SecurityRequestHandlerContext,
          httpServerMock.createKibanaRequest(),
          kibanaResponseFactory
        )
      ).resolves.toEqual({ status: 204, options: {} });
    });
  });
});
