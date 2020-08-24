/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from '../../../../../src/core/server';
import { pluginInitializerContextConfigMock } from '../../../../../src/core/server/mocks';
import { enhancedEsSearchStrategyProvider } from './es_search_strategy';

const mockAsyncResponse = {
  body: {
    id: 'foo',
    response: {
      _shards: {
        total: 10,
        failed: 1,
        skipped: 2,
        successful: 7,
      },
    },
  },
};

const mockRollupResponse = {
  body: {
    _shards: {
      total: 10,
      failed: 1,
      skipped: 2,
      successful: 7,
    },
  },
};

describe('ES search strategy', () => {
  const mockApiCaller = jest.fn();
  const mockLogger: any = {
    debug: () => {},
  };
  const mockContext = {
    core: {
      elasticsearch: { client: { asCurrentUser: { transport: { request: mockApiCaller } } } },
    },
  };
  const mockConfig$ = pluginInitializerContextConfigMock<any>({}).legacy.globalConfig$;

  beforeEach(() => {
    mockApiCaller.mockClear();
  });

  it('returns a strategy with `search`', async () => {
    const esSearch = await enhancedEsSearchStrategyProvider(mockConfig$, mockLogger);

    expect(typeof esSearch.search).toBe('function');
  });

  it('makes a POST request to async search with params when no ID is provided', async () => {
    mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

    const params = { index: 'logstash-*', body: { query: {} } };
    const esSearch = await enhancedEsSearchStrategyProvider(mockConfig$, mockLogger);

    await esSearch.search((mockContext as unknown) as RequestHandlerContext, { params });

    expect(mockApiCaller).toBeCalled();
    const { method, path, body } = mockApiCaller.mock.calls[0][0];
    expect(method).toBe('POST');
    expect(path).toBe('/logstash-*/_async_search');
    expect(body).toEqual({ query: {} });
  });

  it('makes a GET request to async search with ID when ID is provided', async () => {
    mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

    const params = { index: 'logstash-*', body: { query: {} } };
    const esSearch = await enhancedEsSearchStrategyProvider(mockConfig$, mockLogger);

    await esSearch.search((mockContext as unknown) as RequestHandlerContext, { id: 'foo', params });

    expect(mockApiCaller).toBeCalled();
    const { method, path, body } = mockApiCaller.mock.calls[0][0];
    expect(method).toBe('GET');
    expect(path).toBe('/_async_search/foo');
    expect(body).toEqual(undefined);
  });

  it('encodes special characters in the path', async () => {
    mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

    const params = { index: 'foo-程', body: {} };
    const esSearch = await enhancedEsSearchStrategyProvider(mockConfig$, mockLogger);

    await esSearch.search((mockContext as unknown) as RequestHandlerContext, { params });

    expect(mockApiCaller).toBeCalled();
    const { method, path } = mockApiCaller.mock.calls[0][0];
    expect(method).toBe('POST');
    expect(path).toBe('/foo-%E7%A8%8B/_async_search');
  });

  it('calls the rollup API if the index is a rollup type', async () => {
    mockApiCaller.mockResolvedValueOnce(mockRollupResponse);

    const params = { index: 'foo-程', body: {} };
    const esSearch = await enhancedEsSearchStrategyProvider(mockConfig$, mockLogger);

    await esSearch.search((mockContext as unknown) as RequestHandlerContext, {
      indexType: 'rollup',
      params,
    });

    expect(mockApiCaller).toBeCalled();
    const { method, path } = mockApiCaller.mock.calls[0][0];
    expect(method).toBe('POST');
    expect(path).toBe('/foo-%E7%A8%8B/_rollup_search');
  });

  it('sets wait_for_completion_timeout and keep_alive in the request', async () => {
    mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

    const params = { index: 'foo-*', body: {} };
    const esSearch = await enhancedEsSearchStrategyProvider(mockConfig$, mockLogger);

    await esSearch.search((mockContext as unknown) as RequestHandlerContext, { params });

    expect(mockApiCaller).toBeCalled();
    const { querystring } = mockApiCaller.mock.calls[0][0];
    expect(querystring).toHaveProperty('wait_for_completion_timeout');
    expect(querystring).toHaveProperty('keep_alive');
  });
});
