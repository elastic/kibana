/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

describe('createApi', () => {
  it('registers a route with the server', () => {
    const { mock, context, createRouter, post, get, put } = getCoreMock();

    createApi()
      .add(() => ({
        endpoint: 'GET /foo',
        options: { tags: ['access:apm'] },
        handler: async () => null,
      }))
      .add(() => ({
        endpoint: 'POST /bar',
        params: t.type({
          body: t.string,
        }),
        options: { tags: ['access:apm'] },
        handler: async () => null,
      }))
      .add(() => ({
        endpoint: 'PUT /baz',
        options: {
          tags: ['access:apm', 'access:apm_write'],
        },
        handler: async () => null,
      }))
      .add({
        endpoint: 'GET /qux',
        options: {
          tags: ['access:apm', 'access:apm_write'],
        },
        handler: async () => null,
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
        internalError: jest.fn(),
        notFound: jest.fn(),
        forbidden: jest.fn(),
        badRequest: jest.fn(),
      };

      const simulate = (requestMock: any) => {
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

      return { simulate, handlerMock, createRouter, get, post, responseMock };
    };

    it('adds a _debug query parameter by default', async () => {
      const { simulate, handlerMock, responseMock } = initApi();

      await simulate({ query: { _debug: 'true' } });

      expect(responseMock.badRequest).not.toHaveBeenCalled();

      expect(handlerMock).toHaveBeenCalledTimes(1);

      expect(responseMock.ok).toHaveBeenCalled();

      const params = handlerMock.mock.calls[0][0].context.params;

      expect(params).toEqual({
        query: {
          _debug: true,
        },
      });

      await simulate({
        query: {
          _debug: 1,
        },
      });

      expect(responseMock.badRequest).toHaveBeenCalled();
    });

    it('throws if any parameters are used but no types are defined', async () => {
      const { simulate, responseMock } = initApi();

      await simulate({
        query: {
          _debug: true,
          extra: '',
        },
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(1);

      await simulate({
        body: { foo: 'bar' },
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(2);

      await simulate({
        params: {
          foo: 'bar',
        },
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(3);
    });

    it('validates path parameters', async () => {
      const { simulate, handlerMock, responseMock } = initApi(
        t.type({
          path: t.type({
            foo: t.string,
          }),
        })
      );

      await simulate({
        params: {
          foo: 'bar',
        },
      });

      expect(handlerMock).toHaveBeenCalledTimes(1);

      expect(responseMock.ok).toHaveBeenCalledTimes(1);
      expect(responseMock.badRequest).not.toHaveBeenCalled();

      const params = handlerMock.mock.calls[0][0].context.params;

      expect(params).toEqual({
        path: {
          foo: 'bar',
        },
        query: {
          _debug: false,
        },
      });

      await simulate({
        params: {
          bar: 'foo',
        },
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(1);

      await simulate({
        params: {
          foo: 9,
        },
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(2);

      await simulate({
        params: {
          foo: 'bar',
          extra: '',
        },
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(3);
    });

    it('validates body parameters', async () => {
      const { simulate, handlerMock, responseMock } = initApi(
        t.type({
          body: t.string,
        })
      );

      await simulate({
        body: '',
      });

      expect(responseMock.badRequest).not.toHaveBeenCalled();
      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(responseMock.ok).toHaveBeenCalledTimes(1);

      const params = handlerMock.mock.calls[0][0].context.params;

      expect(params).toEqual({
        body: '',
        query: {
          _debug: false,
        },
      });

      await simulate({
        body: null,
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(1);
    });

    it('validates query parameters', async () => {
      const { simulate, handlerMock, responseMock } = initApi(
        t.type({
          query: t.type({
            bar: t.string,
            filterNames: jsonRt.pipe(t.array(t.string)),
          }),
        })
      );

      await simulate({
        query: {
          bar: '',
          _debug: 'true',
          filterNames: JSON.stringify(['hostName', 'agentName']),
        },
      });

      expect(responseMock.badRequest).not.toHaveBeenCalled();
      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(responseMock.ok).toHaveBeenCalledTimes(1);

      const params = handlerMock.mock.calls[0][0].context.params;

      expect(params).toEqual({
        query: {
          bar: '',
          _debug: true,
          filterNames: ['hostName', 'agentName'],
        },
      });

      await simulate({
        query: {
          bar: '',
          foo: '',
        },
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(1);
    });
  });
});
