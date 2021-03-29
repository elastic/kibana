/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createApi } from './index';
import { CoreSetup, Logger } from 'src/core/server';
import { RouteParamsRT } from '../typings';
import { BehaviorSubject } from 'rxjs';
import { APMConfig } from '../..';
import { jsonRt } from '../../../common/runtime_types/json_rt';

const getCoreMock = () => {
  const get = jest.fn();
  const post = jest.fn();
  const put = jest.fn();
  const createRouter = jest.fn().mockReturnValue({
    get,
    post,
    put,
  });

  const mock = {} as CoreSetup;

  return {
    mock: {
      ...mock,
      http: {
        ...mock.http,
        createRouter,
      },
    },
    get,
    post,
    put,
    createRouter,
    context: {
      measure: () => undefined,
      config$: new BehaviorSubject({} as APMConfig),
      logger: ({
        error: jest.fn(),
      } as unknown) as Logger,
      plugins: {},
    },
  };
};

const initApi = (params?: RouteParamsRT) => {
  const { mock, context, createRouter, get, post } = getCoreMock();
  const handlerMock = jest.fn();
  createApi()
    .add(() => ({
      endpoint: 'GET /foo',
      params,
      options: { tags: ['access:apm'] },
      handler: handlerMock,
    }))
    .init(mock, context);

  const routeHandler = get.mock.calls[0][1];

  const responseMock = {
    ok: jest.fn(),
    custom: jest.fn(),
  };

  const simulateRequest = (requestMock: any) => {
    return routeHandler(
      {},
      {
        // stub default values
        params: {},
        query: {},
        body: null,
        ...requestMock,
      },
      responseMock
    );
  };

  return {
    simulateRequest,
    handlerMock,
    createRouter,
    get,
    post,
    responseMock,
  };
};

describe('createApi', () => {
  it('registers a route with the server', () => {
    const { mock, context, createRouter, post, get, put } = getCoreMock();

    createApi()
      .add(() => ({
        endpoint: 'GET /foo',
        options: { tags: ['access:apm'] },
        handler: async () => ({}),
      }))
      .add(() => ({
        endpoint: 'POST /bar',
        params: t.type({
          body: t.string,
        }),
        options: { tags: ['access:apm'] },
        handler: async () => ({}),
      }))
      .add(() => ({
        endpoint: 'PUT /baz',
        options: {
          tags: ['access:apm', 'access:apm_write'],
        },
        handler: async () => ({}),
      }))
      .add({
        endpoint: 'GET /qux',
        options: {
          tags: ['access:apm', 'access:apm_write'],
        },
        handler: async () => ({}),
      })
      .init(mock, context);

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
        const { simulateRequest, handlerMock, responseMock } = initApi();
        await simulateRequest({ query: { _inspect: 'true' } });

        const params = handlerMock.mock.calls[0][0].context.params;
        expect(params).toEqual({ query: { _inspect: true } });
        expect(handlerMock).toHaveBeenCalledTimes(1);

        // responds with ok
        expect(responseMock.custom).not.toHaveBeenCalled();
        expect(responseMock.ok).toHaveBeenCalledWith({
          body: { _inspect: [] },
        });
      });

      it('rejects _inspect=1', async () => {
        const { simulateRequest, responseMock } = initApi();
        await simulateRequest({ query: { _inspect: 1 } });

        // responds with error handler
        expect(responseMock.ok).not.toHaveBeenCalled();
        expect(responseMock.custom).toHaveBeenCalledWith({
          body: {
            attributes: { _inspect: [] },
            message:
              'Invalid value 1 supplied to : strict_keys/query: Partial<{| _inspect: pipe(JSON, boolean) |}>/_inspect: pipe(JSON, boolean)',
          },
          statusCode: 400,
        });
      });

      it('allows omitting _inspect', async () => {
        const { simulateRequest, handlerMock, responseMock } = initApi();
        await simulateRequest({ query: {} });

        const params = handlerMock.mock.calls[0][0].context.params;
        expect(params).toEqual({ query: { _inspect: false } });
        expect(handlerMock).toHaveBeenCalledTimes(1);

        // responds with ok
        expect(responseMock.custom).not.toHaveBeenCalled();
        expect(responseMock.ok).toHaveBeenCalledWith({ body: {} });
      });
    });

    it('throws if unknown parameters are provided', async () => {
      const { simulateRequest, responseMock } = initApi();

      await simulateRequest({
        query: { _inspect: true, extra: '' },
      });

      expect(responseMock.custom).toHaveBeenCalledTimes(1);

      await simulateRequest({
        body: { foo: 'bar' },
      });

      expect(responseMock.custom).toHaveBeenCalledTimes(2);

      await simulateRequest({
        params: {
          foo: 'bar',
        },
      });

      expect(responseMock.custom).toHaveBeenCalledTimes(3);
    });

    it('validates path parameters', async () => {
      const { simulateRequest, handlerMock, responseMock } = initApi(
        t.type({
          path: t.type({
            foo: t.string,
          }),
        })
      );

      await simulateRequest({
        params: {
          foo: 'bar',
        },
      });

      expect(handlerMock).toHaveBeenCalledTimes(1);

      expect(responseMock.ok).toHaveBeenCalledTimes(1);
      expect(responseMock.custom).not.toHaveBeenCalled();

      const params = handlerMock.mock.calls[0][0].context.params;

      expect(params).toEqual({
        path: {
          foo: 'bar',
        },
        query: {
          _inspect: false,
        },
      });

      await simulateRequest({
        params: {
          bar: 'foo',
        },
      });

      expect(responseMock.custom).toHaveBeenCalledTimes(1);

      await simulateRequest({
        params: {
          foo: 9,
        },
      });

      expect(responseMock.custom).toHaveBeenCalledTimes(2);

      await simulateRequest({
        params: {
          foo: 'bar',
          extra: '',
        },
      });

      expect(responseMock.custom).toHaveBeenCalledTimes(3);
    });

    it('validates body parameters', async () => {
      const { simulateRequest, handlerMock, responseMock } = initApi(
        t.type({
          body: t.string,
        })
      );

      await simulateRequest({
        body: '',
      });

      expect(responseMock.custom).not.toHaveBeenCalled();
      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(responseMock.ok).toHaveBeenCalledTimes(1);

      const params = handlerMock.mock.calls[0][0].context.params;

      expect(params).toEqual({
        body: '',
        query: {
          _inspect: false,
        },
      });

      await simulateRequest({
        body: null,
      });

      expect(responseMock.custom).toHaveBeenCalledTimes(1);
    });

    it('validates query parameters', async () => {
      const { simulateRequest, handlerMock, responseMock } = initApi(
        t.type({
          query: t.type({
            bar: t.string,
            filterNames: jsonRt.pipe(t.array(t.string)),
          }),
        })
      );

      await simulateRequest({
        query: {
          bar: '',
          _inspect: 'true',
          filterNames: JSON.stringify(['hostName', 'agentName']),
        },
      });

      expect(responseMock.custom).not.toHaveBeenCalled();
      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(responseMock.ok).toHaveBeenCalledTimes(1);

      const params = handlerMock.mock.calls[0][0].context.params;

      expect(params).toEqual({
        query: {
          bar: '',
          _inspect: true,
          filterNames: ['hostName', 'agentName'],
        },
      });

      await simulateRequest({
        query: {
          bar: '',
          foo: '',
        },
      });

      expect(responseMock.custom).toHaveBeenCalledTimes(1);
    });
  });
});
