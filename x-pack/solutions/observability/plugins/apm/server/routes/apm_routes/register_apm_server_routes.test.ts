/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RouteParamsRT,
  ServerRoute,
  ServerRouteRepository,
} from '@kbn/server-route-repository';
import { passThroughValidationObject } from '@kbn/server-route-repository';
import { z } from '@kbn/zod/v4';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { APMConfig } from '../..';
import type { APMRouteCreateOptions } from '../typings';
import type { APMRouteHandlerResources } from './register_apm_server_routes';
import { registerRoutes } from './register_apm_server_routes';
import { NEVER } from 'rxjs';

const disabledAuthz = {
  authz: {
    enabled: false as const,
    reason: 'This is a test',
  },
};

type RegisterRouteDependencies = Parameters<typeof registerRoutes>[0];

const getRegisterRouteDependencies = () => {
  const get = jest.fn();
  const post = jest.fn();
  const put = jest.fn();
  const createRouter = jest.fn().mockReturnValue({
    get,
    post,
    put,
  });

  const coreSetup = {
    http: {
      createRouter,
    },
  } as unknown as CoreSetup;

  const logger = {
    error: jest.fn(),
  } as unknown as Logger;

  return {
    mocks: {
      get,
      post,
      put,
      createRouter,
      coreSetup,
      logger,
    },
    dependencies: {
      core: {
        setup: coreSetup,
      },
      logger,
      config: {} as APMConfig,
      plugins: {
        apmDataAccess: {
          setup: {
            indices: {
              errorIndices: 'apm-*',
              metricsIndices: 'apm-*',
              spanIndices: 'apm-*',
              transactionIndices: 'apm-*',
            },
          },
        },
      },
    } as unknown as RegisterRouteDependencies,
  };
};

const initApi = (
  routes: Array<
    ServerRoute<
      any,
      RouteParamsRT | undefined,
      APMRouteHandlerResources,
      any,
      APMRouteCreateOptions | undefined
    >
  >
) => {
  const { mocks, dependencies } = getRegisterRouteDependencies();

  const repository: ServerRouteRepository = {};
  for (const route of routes) {
    repository[route.endpoint] = route;
  }

  registerRoutes({
    ...dependencies,
    repository,
  });

  const responseMock = {
    ok: jest.fn(),
    custom: jest.fn(),
  };

  const simulateRequest = (request: {
    method: 'get' | 'post' | 'put';
    pathname: string;
    params?: Record<string, unknown>;
    body?: unknown;
    query?: Record<string, unknown>;
  }) => {
    const [, registeredRouteHandler] =
      mocks[request.method].mock.calls.find((call) => {
        return call[0].path === request.pathname;
      }) ?? [];

    const result = registeredRouteHandler(
      {},
      {
        params: {},
        query: {},
        body: null,
        events: {
          aborted$: NEVER,
        },
        ...request,
      },
      responseMock
    );

    return result;
  };

  return {
    simulateRequest,
    mocks: {
      ...mocks,
      response: responseMock,
    },
  };
};

describe('createApi', () => {
  it('registers a route with the server', () => {
    const {
      mocks: { createRouter, get, post, put },
    } = initApi([
      {
        endpoint: 'GET /foo',
        security: { authz: { requiredPrivileges: ['apm'] } },
        handler: async () => ({}),
      },
      {
        endpoint: 'POST /bar',
        params: z.object({
          body: z.string(),
        }),
        security: { authz: { requiredPrivileges: ['apm'] } },
        handler: async () => ({}),
      },
      {
        endpoint: 'PUT /baz',
        security: { authz: { requiredPrivileges: ['apm', 'apm_write'] } },
        handler: async () => ({}),
      },
      {
        endpoint: 'GET /qux',
        security: { authz: { requiredPrivileges: ['apm', 'apm_write'] } },
        handler: async () => ({}),
      },
      {
        endpoint: 'GET /fez',
        security: { authz: { requiredPrivileges: ['apm', 'apm_settings_write'] } },
        handler: async () => ({}),
      },
    ]);

    expect(createRouter).toHaveBeenCalledTimes(1);

    expect(get).toHaveBeenCalledTimes(3);
    expect(post).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledTimes(1);

    expect(get.mock.calls[0][0]).toEqual({
      options: {},
      security: { authz: { requiredPrivileges: ['apm'] } },
      path: '/foo',
      validate: expect.anything(),
    });

    expect(get.mock.calls[1][0]).toEqual({
      options: {},
      security: { authz: { requiredPrivileges: ['apm', 'apm_write'] } },
      path: '/qux',
      validate: expect.anything(),
    });

    expect(get.mock.calls[2][0]).toEqual({
      options: {},
      security: { authz: { requiredPrivileges: ['apm', 'apm_settings_write'] } },
      path: '/fez',
      validate: expect.anything(),
    });

    expect(post.mock.calls[0][0]).toEqual({
      options: {},
      security: { authz: { requiredPrivileges: ['apm'] } },
      path: '/bar',
      validate: expect.anything(),
    });

    expect(put.mock.calls[0][0]).toEqual({
      options: {},
      security: { authz: { requiredPrivileges: ['apm', 'apm_write'] } },
      path: '/baz',
      validate: expect.anything(),
    });
  });

  describe('when using zod', () => {
    it('validates via Core, merging `_inspect` into the declared query schema', () => {
      const {
        mocks: { get },
      } = initApi([
        {
          endpoint: 'GET /foo',
          params: z.object({
            path: z.object({ id: z.string() }),
            query: z.object({ bar: z.string() }),
          }),
          security: disabledAuthz,
          handler: async () => ({}),
        },
      ]);

      const { validate } = get.mock.calls[0][0];

      // Every route (including param-less ones) is now Core-validated via a zod
      // validation object, never the pass-through object.
      expect(validate).not.toBe(passThroughValidationObject);

      // path: only the declared keys are allowed
      expect(validate.params.parse({ id: 'abc' })).toEqual({ id: 'abc' });
      expect(() => validate.params.parse({ id: 'abc', extra: 'x' })).toThrow();

      // query: the route's own field and `_inspect` coexist
      expect(validate.query.parse({ bar: 'baz', _inspect: 'true' })).toEqual({
        bar: 'baz',
        _inspect: true,
      });
      expect(validate.query.parse({ bar: 'baz' })).toEqual({ bar: 'baz' });
      expect(() => validate.query.parse({ bar: 'baz', _inspect: 1 })).toThrow();
      expect(() => validate.query.parse({ bar: 'baz', extra: 'x' })).toThrow();
    });

    it('still accepts `_inspect` when the route declares no query params', () => {
      const {
        mocks: { post },
      } = initApi([
        {
          endpoint: 'POST /foo',
          params: z.object({ body: z.object({ value: z.string() }) }),
          security: disabledAuthz,
          handler: async () => ({}),
        },
      ]);

      const { validate } = post.mock.calls[0][0];

      expect(validate.query.parse({})).toEqual({});
      expect(validate.query.parse({ _inspect: 'false' })).toEqual({ _inspect: false });
      expect(() => validate.query.parse({ somethingElse: 'x' })).toThrow();
    });

    it('passes params straight through to the handler without re-decoding them', async () => {
      const handlerMock = jest.fn().mockResolvedValue({});
      const {
        simulateRequest,
        mocks: { response },
      } = initApi([
        {
          endpoint: 'GET /foo',
          params: z.object({
            path: z.object({ id: z.string() }),
            query: z.object({ bar: z.string() }),
          }),
          handler: handlerMock,
          security: disabledAuthz,
        },
      ]);

      // Simulates what Core hands the handler after successfully validating
      // and coercing the request against `validate` above.
      await simulateRequest({
        method: 'get',
        pathname: '/foo',
        params: { id: 'abc' },
        query: { bar: 'baz', _inspect: true },
      });

      expect(response.custom).not.toHaveBeenCalled();
      const params = handlerMock.mock.calls[0][0].params;
      expect(params).toEqual({
        path: { id: 'abc' },
        query: { bar: 'baz', _inspect: true },
      });
    });

    it('defaults `_inspect` to false when omitted', async () => {
      const handlerMock = jest.fn().mockResolvedValue({});
      const {
        simulateRequest,
        mocks: { response },
      } = initApi([
        {
          endpoint: 'GET /foo',
          params: z.object({ query: z.object({ bar: z.string() }) }),
          handler: handlerMock,
          security: disabledAuthz,
        },
      ]);

      await simulateRequest({
        method: 'get',
        pathname: '/foo',
        query: { bar: 'baz' },
      });

      expect(response.custom).not.toHaveBeenCalled();
      const params = handlerMock.mock.calls[0][0].params;
      expect(params).toEqual({ query: { bar: 'baz', _inspect: false } });
    });
  });
});
