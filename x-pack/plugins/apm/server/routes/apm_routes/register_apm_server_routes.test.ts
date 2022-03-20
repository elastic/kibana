/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { jsonRt } from '@kbn/io-ts-utils';
import {
  ServerRoute,
  ServerRouteRepository,
} from '@kbn/server-route-repository';
import * as t from 'io-ts';
import { CoreSetup, Logger } from 'src/core/server';
import { APMConfig } from '../..';
import { APMRouteCreateOptions, APMRouteHandlerResources } from '../typings';
import { registerRoutes } from './register_apm_server_routes';

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
      plugins: {},
    } as unknown as RegisterRouteDependencies,
  };
};

const initApi = (
  routes: Array<
    ServerRoute<
      any,
      t.Any,
      APMRouteHandlerResources,
      any,
      APMRouteCreateOptions
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
          aborted$: {
            toPromise: () => new Promise(() => {}),
          },
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
        options: { tags: ['access:apm'] },
        handler: async () => ({}),
      },
      {
        endpoint: 'POST /bar',
        params: t.type({
          body: t.string,
        }),
        options: { tags: ['access:apm'] },
        handler: async () => ({}),
      },
      {
        endpoint: 'PUT /baz',
        options: {
          tags: ['access:apm', 'access:apm_write'],
        },
        handler: async () => ({}),
      },
      {
        endpoint: 'GET /qux',
        options: {
          tags: ['access:apm', 'access:apm_write'],
        },
        handler: async () => ({}),
      },
    ]);

    expect(createRouter).toHaveBeenCalledTimes(1);

    expect(get).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledTimes(1);

    expect(get.mock.calls[0][0]).toEqual({
      options: {
        tags: ['access:apm'],
      },
      path: '/foo',
      validate: expect.anything(),
    });

    expect(get.mock.calls[1][0]).toEqual({
      options: {
        tags: ['access:apm', 'access:apm_write'],
      },
      path: '/qux',
      validate: expect.anything(),
    });

    expect(post.mock.calls[0][0]).toEqual({
      options: {
        tags: ['access:apm'],
      },
      path: '/bar',
      validate: expect.anything(),
    });

    expect(put.mock.calls[0][0]).toEqual({
      options: {
        tags: ['access:apm', 'access:apm_write'],
      },
      path: '/baz',
      validate: expect.anything(),
    });
  });

  describe('when validating', () => {
    describe('_inspect', () => {
      it('allows _inspect=true', async () => {
        const handlerMock = jest.fn().mockResolvedValue({});
        const {
          simulateRequest,
          mocks: { response },
        } = initApi([
          {
            endpoint: 'GET /foo',
            options: {
              tags: [],
            },
            handler: handlerMock,
          },
        ]);

        await simulateRequest({
          method: 'get',
          pathname: '/foo',
          query: { _inspect: 'true' },
        });

        // responds with ok
        expect(response.custom).not.toHaveBeenCalled();

        const params = handlerMock.mock.calls[0][0].params;
        expect(params).toEqual({ query: { _inspect: true } });
        expect(handlerMock).toHaveBeenCalledTimes(1);
        expect(response.ok).toHaveBeenCalledWith({
          body: { _inspect: [] },
        });
      });

      it('rejects _inspect=1', async () => {
        const handlerMock = jest.fn().mockResolvedValue({});

        const {
          simulateRequest,
          mocks: { response },
        } = initApi([
          {
            endpoint: 'GET /foo',
            options: {
              tags: [],
            },
            handler: handlerMock,
          },
        ]);
        await simulateRequest({
          method: 'get',
          pathname: '/foo',
          query: { _inspect: 1 },
        });

        // responds with error handler
        expect(response.ok).not.toHaveBeenCalled();
        expect(response.custom).toHaveBeenCalledWith({
          body: {
            attributes: { _inspect: [] },
            message:
              'Invalid value 1 supplied to : Partial<{| query: Partial<{| _inspect: pipe(JSON, boolean) |}> |}>/query: Partial<{| _inspect: pipe(JSON, boolean) |}>/_inspect: pipe(JSON, boolean)',
          },
          statusCode: 400,
        });
      });

      it('allows omitting _inspect', async () => {
        const handlerMock = jest.fn().mockResolvedValue({});

        const {
          simulateRequest,
          mocks: { response },
        } = initApi([
          { endpoint: 'GET /foo', options: { tags: [] }, handler: handlerMock },
        ]);
        await simulateRequest({
          method: 'get',
          pathname: '/foo',
          query: {},
        });

        // responds with ok
        expect(response.custom).not.toHaveBeenCalled();

        const params = handlerMock.mock.calls[0][0].params;
        expect(params).toEqual({ query: { _inspect: false } });
        expect(handlerMock).toHaveBeenCalledTimes(1);

        expect(response.ok).toHaveBeenCalledWith({ body: {} });
      });
    });

    it('throws if unknown parameters are provided', async () => {
      const {
        simulateRequest,
        mocks: { response },
      } = initApi([
        {
          endpoint: 'GET /foo',
          options: { tags: [] },
          handler: jest.fn().mockResolvedValue({}),
        },
      ]);

      await simulateRequest({
        method: 'get',
        pathname: '/foo',
        query: { _inspect: 'true', extra: '' },
      });

      expect(response.custom).toHaveBeenCalledTimes(1);

      await simulateRequest({
        method: 'get',
        pathname: '/foo',
        body: { foo: 'bar' },
      });

      expect(response.custom).toHaveBeenCalledTimes(2);

      await simulateRequest({
        method: 'get',
        pathname: '/foo',
        params: {
          foo: 'bar',
        },
      });

      expect(response.custom).toHaveBeenCalledTimes(3);
    });

    it('validates path parameters', async () => {
      const handlerMock = jest.fn().mockResolvedValue({});
      const {
        simulateRequest,
        mocks: { response },
      } = initApi([
        {
          endpoint: 'GET /foo',
          options: { tags: [] },
          params: t.type({
            path: t.type({
              foo: t.string,
            }),
          }),
          handler: handlerMock,
        },
      ]);

      await simulateRequest({
        method: 'get',
        pathname: '/foo',
        params: {
          foo: 'bar',
        },
      });

      expect(handlerMock).toHaveBeenCalledTimes(1);

      expect(response.ok).toHaveBeenCalledTimes(1);
      expect(response.custom).not.toHaveBeenCalled();

      const params = handlerMock.mock.calls[0][0].params;

      expect(params).toEqual({
        path: {
          foo: 'bar',
        },
        query: {
          _inspect: false,
        },
      });

      await simulateRequest({
        method: 'get',
        pathname: '/foo',
        params: {
          bar: 'foo',
        },
      });

      expect(response.custom).toHaveBeenCalledTimes(1);

      await simulateRequest({
        method: 'get',
        pathname: '/foo',
        params: {
          foo: 9,
        },
      });

      expect(response.custom).toHaveBeenCalledTimes(2);

      await simulateRequest({
        method: 'get',
        pathname: '/foo',
        params: {
          foo: 'bar',
          extra: '',
        },
      });

      expect(response.custom).toHaveBeenCalledTimes(3);
    });

    it('validates body parameters', async () => {
      const handlerMock = jest.fn().mockResolvedValue({});
      const {
        simulateRequest,
        mocks: { response },
      } = initApi([
        {
          endpoint: 'GET /foo',
          options: {
            tags: [],
          },
          params: t.type({
            body: t.string,
          }),
          handler: handlerMock,
        },
      ]);

      await simulateRequest({
        method: 'get',
        pathname: '/foo',
        body: '',
      });

      expect(response.custom).not.toHaveBeenCalled();
      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(response.ok).toHaveBeenCalledTimes(1);

      const params = handlerMock.mock.calls[0][0].params;

      expect(params).toEqual({
        body: '',
        query: {
          _inspect: false,
        },
      });

      await simulateRequest({
        method: 'get',
        pathname: '/foo',
        body: null,
      });

      expect(response.custom).toHaveBeenCalledTimes(1);
    });

    it('validates query parameters', async () => {
      const handlerMock = jest.fn().mockResolvedValue({});
      const {
        simulateRequest,
        mocks: { response },
      } = initApi([
        {
          endpoint: 'GET /foo',
          options: {
            tags: [],
          },
          params: t.type({
            query: t.type({
              bar: t.string,
              filterNames: jsonRt.pipe(t.array(t.string)),
            }),
          }),
          handler: handlerMock,
        },
      ]);

      await simulateRequest({
        method: 'get',
        pathname: '/foo',
        query: {
          bar: '',
          _inspect: 'true',
          filterNames: JSON.stringify(['hostName', 'agentName']),
        },
      });

      expect(response.custom).not.toHaveBeenCalled();
      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(response.ok).toHaveBeenCalledTimes(1);

      const params = handlerMock.mock.calls[0][0].params;

      expect(params).toEqual({
        query: {
          bar: '',
          _inspect: true,
          filterNames: ['hostName', 'agentName'],
        },
      });

      await simulateRequest({
        method: 'get',
        pathname: '/foo',
        query: {
          bar: '',
          foo: '',
        },
      });

      expect(response.custom).toHaveBeenCalledTimes(1);
    });
  });
});
