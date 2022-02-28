/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '../../../../../../src/core/server/mocks';

import { usageCollectionPluginMock } from '../../../../../../src/plugins/usage_collection/server/mocks';

import { CasesRouter } from '../../types';
import { createCasesRoute } from './create_cases_route';
import { registerRoutes } from './register_routes';
import { CaseRoute } from './types';
import { extractWarningValueFromWarningHeader } from './utils';

describe('registerRoutes', () => {
  let router: jest.Mocked<CasesRouter>;
  const logger = loggingSystemMock.createLogger();
  const response = httpServerMock.createResponseFactory();
  const telemetryUsageCounter = usageCollectionPluginMock
    .createSetupContract()
    .createUsageCounter('test');

  const handler = jest.fn();
  const customError = jest.fn();
  const badRequest = jest.fn();

  const routes = [
    createCasesRoute({
      method: 'get',
      path: '/foo/{case_id}',
      params: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: schema.object({
          includeComments: schema.boolean(),
        }),
      },
      handler,
    }),

    createCasesRoute({
      method: 'post',
      path: '/bar',
      params: {
        body: schema.object({
          title: schema.string(),
        }),
      },
      handler: async () => response.ok(),
    }),
    createCasesRoute({
      method: 'put',
      path: '/baz',
      handler: async () => response.ok(),
    }),
    createCasesRoute({
      method: 'patch',
      path: '/qux',
      handler: async () => response.ok(),
    }),
    createCasesRoute({
      method: 'delete',
      path: '/quux',
      handler: async () => response.ok(),
    }),
  ] as CaseRoute[];

  const initApi = (casesRoutes: CaseRoute[]) => {
    registerRoutes({
      router,
      logger,
      routes: casesRoutes,
      kibanaVersion: '8.2.0',
      telemetryUsageCounter,
    });

    const simulateRequest = async ({
      method,
      path,
      context = { cases: {} },
      headers = {},
    }: {
      method: keyof Pick<CasesRouter, 'get' | 'post'>;
      path: string;
      context?: Record<string, unknown>;
      headers?: Record<string, unknown>;
    }) => {
      const [, registeredRouteHandler] =
        // @ts-ignore
        router[method].mock.calls.find((call) => {
          return call[0].path === path;
        }) ?? [];

      const result = await registeredRouteHandler(
        context,
        { headers },
        { customError, badRequest }
      );

      return result;
    };

    return {
      simulateRequest,
    };
  };

  const initAndSimulateError = async () => {
    const { simulateRequest } = initApi([
      ...routes,
      createCasesRoute({
        method: 'get',
        path: '/error',
        handler: async () => {
          throw new Error('API error');
        },
      }),
    ]);

    await simulateRequest({
      method: 'get',
      path: '/error',
    });
  };

  const initAndSimulateDeprecationEndpoint = async (headers?: Record<string, unknown>) => {
    const { simulateRequest } = initApi([
      ...routes,
      createCasesRoute({
        method: 'get',
        path: '/deprecated',
        options: { deprecated: true },
        handler: async () => response.ok(),
      }),
    ]);

    const res = await simulateRequest({
      method: 'get',
      path: '/deprecated',
      headers,
    });

    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
  });

  describe('api registration', () => {
    const endpoints: Array<[CaseRoute['method'], string]> = [
      ['get', '/foo/{case_id}'],
      ['post', '/bar'],
      ['put', '/baz'],
      ['patch', '/qux'],
      ['delete', '/quux'],
    ];

    it('registers the endpoints correctly', () => {
      initApi(routes);

      for (const endpoint of endpoints) {
        const [method, path] = endpoint;

        expect(router[method]).toHaveBeenCalledTimes(1);
        expect(router[method]).toBeCalledWith(
          { path, validate: expect.anything() },
          expect.anything()
        );
      }
    });
  });

  describe('api validation', () => {
    const validation: Array<
      ['params' | 'query' | 'body', keyof CasesRouter, Record<string, unknown>]
    > = [
      ['params', 'get', { case_id: '123' }],
      ['query', 'get', { includeComments: false }],
      ['body', 'post', { title: 'test' }],
    ];

    describe.each(validation)('%s', (type, method, value) => {
      it(`validates ${type} correctly`, () => {
        initApi(routes);
        // @ts-ignore
        const params = router[method].mock.calls[0][0].validate[type];
        expect(() => params.validate(value)).not.toThrow();
      });

      it(`throws if ${type} is wrong`, () => {
        initApi(routes);
        // @ts-ignore
        const params = router[method].mock.calls[0][0].validate[type];
        expect(() => params.validate({})).toThrow();
      });

      it(`skips path parameter validation if ${type} is not provided`, () => {
        initApi(routes);
        // @ts-ignore
        const params = router.put.mock.calls[0][0].validate[type];
        expect(() => params.validate({})).not.toThrow();
      });
    });
  });

  describe('handler execution', () => {
    it('calls the handler correctly', async () => {
      const { simulateRequest } = initApi(routes);
      await simulateRequest({ method: 'get', path: '/foo/{case_id}' });
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('telemetry', () => {
    it('increases the counters correctly on a successful kibana request', async () => {
      const { simulateRequest } = initApi(routes);
      await simulateRequest({
        method: 'get',
        path: '/foo/{case_id}',
        headers: { 'kbn-version': '8.2.0', referer: 'https://example.com' },
      });
      expect(telemetryUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'GET /foo/{case_id}',
        counterType: 'success',
      });

      expect(telemetryUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'GET /foo/{case_id}',
        counterType: 'kibanaRequest.yes',
      });
    });

    it('increases the counters correctly on a successful non kibana request', async () => {
      const { simulateRequest } = initApi(routes);
      await simulateRequest({
        method: 'get',
        path: '/foo/{case_id}',
      });
      expect(telemetryUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'GET /foo/{case_id}',
        counterType: 'success',
      });

      expect(telemetryUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'GET /foo/{case_id}',
        counterType: 'kibanaRequest.no',
      });
    });

    it('increases the counters correctly on an error', async () => {
      await initAndSimulateError();

      expect(telemetryUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'GET /error',
        counterType: 'error',
      });
    });

    it('increases the deprecation counters correctly', async () => {
      await initAndSimulateDeprecationEndpoint();

      expect(telemetryUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'GET /deprecated',
        counterType: 'deprecated',
      });
    });
  });

  describe('deprecation', () => {
    it('logs the deprecation message if it is not a kibana request', async () => {
      await initAndSimulateDeprecationEndpoint();

      expect(logger.warn).toHaveBeenCalledWith('The endpoint GET /deprecated is deprecated.');
    });

    it('does NOT log the deprecation message if it is a kibana request', async () => {
      await initAndSimulateDeprecationEndpoint({
        'kbn-version': '8.2.0',
        referer: 'https://example.com',
      });

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('adds the warning header', async () => {
      response.ok.mockReturnValue({ status: 200, options: {} });
      const res = await initAndSimulateDeprecationEndpoint();
      const warningHeader = res.options.headers.warning;
      const warningValue = extractWarningValueFromWarningHeader(warningHeader);
      expect(warningValue).toBe('Deprecated endpoint');
    });
  });

  describe('errors', () => {
    it('logs the error', async () => {
      await initAndSimulateError();

      expect(logger.error).toBeCalledWith('API error');
    });

    it('returns an error response', async () => {
      await initAndSimulateError();

      expect(customError).toBeCalledWith({
        body: expect.anything(),
        headers: {},
        statusCode: 500,
      });
    });

    it('returns an error response when the case context is not registered', async () => {
      const { simulateRequest } = initApi(routes);
      await simulateRequest({
        method: 'get',
        path: '/foo/{case_id}',
        context: {},
      });

      expect(badRequest).toBeCalledWith({
        body: 'RouteHandlerContext is not registered for cases',
      });
    });
  });
});
