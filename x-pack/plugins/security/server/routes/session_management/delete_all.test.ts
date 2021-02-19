/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { SecurityRequestHandlerContext, SecurityRouter } from '../../types';
import {
  kibanaResponseFactory,
  RequestHandler,
  RouteConfig,
} from '../../../../../../src/core/server';
import type { Session } from '../../session_management';
import { defineDeleteAllSessionsRoutes } from './delete_all';

import { httpServerMock } from '../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../index.mock';
import { sessionMock } from '../../session_management/session.mock';

describe('Delete all sessions routes', () => {
  let router: jest.Mocked<SecurityRouter>;
  let session: jest.Mocked<PublicMethodsOf<Session>>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;

    session = sessionMock.create();
    routeParamsMock.getSession.mockReturnValue(session);

    defineDeleteAllSessionsRoutes(routeParamsMock);
  });

  describe('delete sessions', () => {
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [extendRouteConfig, extendRouteHandler] = router.delete.mock.calls.find(
        ([{ path }]) => path === '/internal/security/session/_all'
      )!;

      routeConfig = extendRouteConfig;
      routeHandler = extendRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ tags: ['access:sessionManagement'] });

      const querySchema = (routeConfig.validate as any).query as ObjectType;
      expect(() =>
        querySchema.validate({ providerName: 'basic1' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[request query.providerType]: expected value of type [string] but got [undefined]"`
      );
      expect(() => querySchema.validate({ username: 'user' })).toThrowErrorMatchingInlineSnapshot(
        `"[request query.providerType]: expected value of type [string] but got [undefined]"`
      );
      expect(() =>
        querySchema.validate({ providerName: 'basic1', username: 'user' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[request query.providerType]: expected value of type [string] but got [undefined]"`
      );

      expect(querySchema.validate(undefined)).toBeUndefined();
      expect(querySchema.validate({})).toEqual({});
      expect(querySchema.validate({ providerType: 'basic' })).toEqual({ providerType: 'basic' });
      expect(querySchema.validate({ providerType: 'basic', providerName: 'basic1' })).toEqual({
        providerType: 'basic',
        providerName: 'basic1',
      });
      expect(querySchema.validate({ providerType: 'basic', username: 'user' })).toEqual({
        providerType: 'basic',
        username: 'user',
      });
      expect(
        querySchema.validate({ providerType: 'basic', providerName: 'basic1', username: 'user' })
      ).toEqual({
        providerType: 'basic',
        providerName: 'basic1',
        username: 'user',
      });
    });

    it('uses query string to construct filter.', async () => {
      session.clearAll.mockResolvedValue(30);

      const mockRequest = httpServerMock.createKibanaRequest({
        query: { providerType: 'basic', providerName: 'basic1', username: 'user' },
      });
      await expect(
        routeHandler(
          ({} as unknown) as SecurityRequestHandlerContext,
          mockRequest,
          kibanaResponseFactory
        )
      ).resolves.toEqual({
        status: 200,
        options: { body: { total: 30 } },
        payload: { total: 30 },
      });

      expect(session.clearAll).toHaveBeenCalledTimes(1);
      expect(session.clearAll).toHaveBeenCalledWith(mockRequest, {
        provider: { type: 'basic', name: 'basic1' },
        username: 'user',
      });
    });

    it('does not specify filter if it is not specified in the query.', async () => {
      session.clearAll.mockResolvedValue(30);

      const mockRequest = httpServerMock.createKibanaRequest();
      await expect(
        routeHandler(
          ({} as unknown) as SecurityRequestHandlerContext,
          mockRequest,
          kibanaResponseFactory
        )
      ).resolves.toEqual({
        status: 200,
        options: { body: { total: 30 } },
        payload: { total: 30 },
      });

      expect(session.clearAll).toHaveBeenCalledTimes(1);
      expect(session.clearAll).toHaveBeenCalledWith(mockRequest, undefined);
    });
  });
});
