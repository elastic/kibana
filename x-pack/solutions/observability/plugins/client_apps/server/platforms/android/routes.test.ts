/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { IRouter } from '@kbn/core/server';
import {
  ANDROID_CRASH_DOCUMENT_API_PATH,
  ANDROID_CRASH_EVENT_NAMES,
  ANDROID_RETRACE_API_PATH,
  DEFAULT_CRASH_INDEX,
} from '../../../common';
import { registerAndroidRoutes } from './routes';
import { RetraceMapNotFoundError, retrace } from './retrace';

jest.mock('./retrace', () => {
  class MockRetraceMapNotFoundError extends Error {
    constructor(buildId: string) {
      super(`No R8 mapping found for build ID "${buildId}"`);
      this.name = 'RetraceMapNotFoundError';
    }
  }

  return {
    RetraceMapNotFoundError: MockRetraceMapNotFoundError,
    retrace: jest.fn(),
  };
});

interface TestEsClient {
  search: jest.Mock;
}

interface TestContext {
  core: Promise<{
    elasticsearch: {
      client: {
        asCurrentUser: TestEsClient;
      };
    };
  }>;
}

interface TestResponse {
  ok: jest.Mock;
  notFound: jest.Mock;
  badRequest: jest.Mock;
  customError: jest.Mock;
}

type TestHandler<Query = Record<string, unknown>, Body = Record<string, unknown>> = (
  context: TestContext,
  request: { query: Query; body: Body },
  response: TestResponse
) => Promise<unknown>;

const mockedRetrace = jest.mocked(retrace);

function createRouterMock() {
  return {
    get: jest.fn(),
    post: jest.fn(),
  };
}

function createResponseMock(): TestResponse {
  return {
    ok: jest.fn((value) => ({ type: 'ok', ...value })),
    notFound: jest.fn((value) => ({ type: 'notFound', ...value })),
    badRequest: jest.fn((value) => ({ type: 'badRequest', ...value })),
    customError: jest.fn((value) => ({ type: 'customError', ...value })),
  };
}

function createContext(search: jest.Mock): TestContext {
  return {
    core: Promise.resolve({
      elasticsearch: {
        client: {
          asCurrentUser: {
            search,
          },
        },
      },
    }),
  };
}

function setupRoutes() {
  const router = createRouterMock();
  const logger = loggingSystemMock.createLogger();

  registerAndroidRoutes({ router: router as unknown as IRouter, logger });

  return { router, logger };
}

describe('registerAndroidRoutes', () => {
  beforeEach(() => {
    mockedRetrace.mockReset();
  });

  it('registers both Android routes as internal APIs', () => {
    const { router } = setupRoutes();

    expect(router.get).toHaveBeenCalledTimes(1);
    expect(router.get.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        path: ANDROID_CRASH_DOCUMENT_API_PATH,
        options: { access: 'internal' },
      })
    );

    expect(router.post).toHaveBeenCalledTimes(1);
    expect(router.post.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        path: ANDROID_RETRACE_API_PATH,
        options: { access: 'internal' },
      })
    );
  });

  describe('GET crash document', () => {
    function getCrashDocumentHandler(router: ReturnType<typeof createRouterMock>) {
      return router.get.mock.calls[0][1] as TestHandler<
        {
          session_id: string;
          timestamp: string;
          app_build_id: string;
          index?: string;
        },
        Record<string, never>
      >;
    }

    const identityQuery = {
      session_id: 'session-1',
      timestamp: '2026-02-13T15:55:35.495Z',
      app_build_id: 'build-1',
    };

    it('fetches stacktrace and build ID from the default crash index', async () => {
      const { router } = setupRoutes();
      const handler = getCrashDocumentHandler(router);
      const search = jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                attributes: {
                  'exception.stacktrace': 'java.lang.RuntimeException: boom',
                },
              },
            },
          ],
        },
      });
      const response = createResponseMock();

      await handler(createContext(search), { query: identityQuery, body: {} }, response);

      expect(search).toHaveBeenCalledWith({
        index: DEFAULT_CRASH_INDEX,
        query: {
          bool: {
            filter: [
              { term: { 'session.id': 'session-1' } },
              { term: { '@timestamp': '2026-02-13T15:55:35.495Z' } },
              { term: { 'app.build_id': 'build-1' } },
              { terms: { event_name: ANDROID_CRASH_EVENT_NAMES } },
            ],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
        size: 1,
        _source: ['attributes'],
      });
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          stacktrace: 'java.lang.RuntimeException: boom',
          build_id: 'build-1',
        },
      });
    });

    it('uses the free-form index pattern when provided', async () => {
      const { router } = setupRoutes();
      const handler = getCrashDocumentHandler(router);
      const search = jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                attributes: {
                  'exception.stacktrace': 'trace',
                },
              },
            },
          ],
        },
      });

      await handler(
        createContext(search),
        { query: { ...identityQuery, index: 'logs-myapp.otel*' }, body: {} },
        createResponseMock()
      );

      expect(search).toHaveBeenCalledWith(expect.objectContaining({ index: 'logs-myapp.otel*' }));
    });

    it('returns 404 when the crash document is missing', async () => {
      const { router } = setupRoutes();
      const handler = getCrashDocumentHandler(router);
      const response = createResponseMock();

      await handler(
        createContext(jest.fn().mockResolvedValue({ hits: { hits: [] } })),
        { query: identityQuery, body: {} },
        response
      );

      expect(response.notFound).toHaveBeenCalledWith({
        body: {
          message: `No Android crash document found for session.id="session-1", @timestamp="2026-02-13T15:55:35.495Z", app.build_id="build-1" in index "${DEFAULT_CRASH_INDEX}"`,
        },
      });
    });

    it('returns 400 when the crash document has no stacktrace', async () => {
      const { router } = setupRoutes();
      const handler = getCrashDocumentHandler(router);
      const response = createResponseMock();

      await handler(
        createContext(
          jest.fn().mockResolvedValue({
            hits: {
              hits: [
                {
                  _source: {
                    attributes: {},
                  },
                },
              ],
            },
          })
        ),
        { query: identityQuery, body: {} },
        response
      );

      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message:
            'Document for session.id="session-1", @timestamp="2026-02-13T15:55:35.495Z", app.build_id="build-1" has no exception.stacktrace field',
        },
      });
    });
  });

  describe('POST retrace', () => {
    function getRetraceHandler(router: ReturnType<typeof createRouterMock>) {
      return router.post.mock.calls[0][1] as TestHandler<
        Record<string, never>,
        { stacktrace: string; build_id: string }
      >;
    }

    it('returns the original and retraced stacktrace', async () => {
      const { logger, router } = setupRoutes();
      const handler = getRetraceHandler(router);
      const search = jest.fn();
      const response = createResponseMock();
      mockedRetrace.mockResolvedValue('retraced stacktrace');

      await handler(
        createContext(search),
        { query: {}, body: { stacktrace: 'original stacktrace', build_id: 'build-1' } },
        response
      );

      expect(mockedRetrace).toHaveBeenCalledWith({
        esClient: { search },
        stacktrace: 'original stacktrace',
        buildId: 'build-1',
        logger,
      });
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          original: 'original stacktrace',
          retraced: 'retraced stacktrace',
        },
      });
    });

    it('returns 404 when the mapping index does not exist', async () => {
      const { router } = setupRoutes();
      const handler = getRetraceHandler(router);
      const response = createResponseMock();
      mockedRetrace.mockRejectedValue(new RetraceMapNotFoundError('build-1'));

      await handler(
        createContext(jest.fn()),
        { query: {}, body: { stacktrace: 'original stacktrace', build_id: 'build-1' } },
        response
      );

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'No R8 mapping found for build ID "build-1"' },
      });
    });
  });
});
