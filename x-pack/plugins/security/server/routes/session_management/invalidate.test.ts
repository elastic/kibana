/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import type { RequestHandler, RouteConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { Session } from '../../session_management';
import { sessionMock } from '../../session_management/session.mock';
import type { SecurityRequestHandlerContext, SecurityRouter } from '../../types';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineInvalidateSessionsRoutes } from './invalidate';

describe('Invalidate sessions routes', () => {
  let router: jest.Mocked<SecurityRouter>;
  let session: jest.Mocked<PublicMethodsOf<Session>>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;

    session = sessionMock.create();
    routeParamsMock.getSession.mockReturnValue(session);

    defineInvalidateSessionsRoutes(routeParamsMock);
  });

  describe('invalidate sessions', () => {
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [extendRouteConfig, extendRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/api/security/session/_invalidate'
      )!;

      routeConfig = extendRouteConfig;
      routeHandler = extendRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ tags: ['access:sessionManagement'] });

      const bodySchema = (routeConfig.validate as any).body as ObjectType;
      expect(() => bodySchema.validate({})).toThrowErrorMatchingInlineSnapshot(
        `"[match]: expected at least one defined value but got [undefined]"`
      );
      expect(() => bodySchema.validate({ match: 'current' })).toThrowErrorMatchingInlineSnapshot(`
        "[match]: types that failed validation:
        - [match.0]: expected value to equal [all]
        - [match.1]: expected value to equal [query]"
      `);
      expect(() =>
        bodySchema.validate({ match: 'all', query: { provider: { type: 'basic' } } })
      ).toThrowErrorMatchingInlineSnapshot(`"[query]: a value wasn't expected to be present"`);
      expect(() => bodySchema.validate({ match: 'query' })).toThrowErrorMatchingInlineSnapshot(
        `"[query.provider.type]: expected value of type [string] but got [undefined]"`
      );
      expect(() =>
        bodySchema.validate({ match: 'query', query: { username: 'user' } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[query.provider.type]: expected value of type [string] but got [undefined]"`
      );
      expect(() =>
        bodySchema.validate({
          match: 'query',
          query: { provider: { name: 'basic1' }, username: 'user' },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[query.provider.type]: expected value of type [string] but got [undefined]"`
      );

      expect(bodySchema.validate({ match: 'all' })).toEqual({ match: 'all' });
      expect(
        bodySchema.validate({ match: 'query', query: { provider: { type: 'basic' } } })
      ).toEqual({
        match: 'query',
        query: { provider: { type: 'basic' } },
      });
      expect(
        bodySchema.validate({
          match: 'query',
          query: { provider: { type: 'basic', name: 'basic1' } },
        })
      ).toEqual({ match: 'query', query: { provider: { type: 'basic', name: 'basic1' } } });
      expect(
        bodySchema.validate({
          match: 'query',
          query: { provider: { type: 'basic' }, username: 'user' },
        })
      ).toEqual({ match: 'query', query: { provider: { type: 'basic' }, username: 'user' } });
      expect(
        bodySchema.validate({
          match: 'query',
          query: { provider: { type: 'basic', name: 'basic1' }, username: 'user' },
        })
      ).toEqual({
        match: 'query',
        query: { provider: { type: 'basic', name: 'basic1' }, username: 'user' },
      });
    });

    it('properly constructs `query` match filter.', async () => {
      session.invalidate.mockResolvedValue(30);

      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          match: 'query',
          query: { provider: { type: 'basic', name: 'basic1' }, username: 'user' },
        },
      });
      await expect(
        routeHandler(
          {} as unknown as SecurityRequestHandlerContext,
          mockRequest,
          kibanaResponseFactory
        )
      ).resolves.toEqual({
        status: 200,
        options: { body: { total: 30 } },
        payload: { total: 30 },
      });

      expect(session.invalidate).toHaveBeenCalledTimes(1);
      expect(session.invalidate).toHaveBeenCalledWith(mockRequest, {
        match: 'query',
        query: { provider: { type: 'basic', name: 'basic1' }, username: 'user' },
      });
    });

    it('properly constructs `all` match filter.', async () => {
      session.invalidate.mockResolvedValue(30);

      const mockRequest = httpServerMock.createKibanaRequest({ body: { match: 'all' } });
      await expect(
        routeHandler(
          {} as unknown as SecurityRequestHandlerContext,
          mockRequest,
          kibanaResponseFactory
        )
      ).resolves.toEqual({
        status: 200,
        options: { body: { total: 30 } },
        payload: { total: 30 },
      });

      expect(session.invalidate).toHaveBeenCalledTimes(1);
      expect(session.invalidate).toHaveBeenCalledWith(mockRequest, { match: 'all' });
    });
  });
});
