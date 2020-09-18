/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from '../../../../../src/core/server';
import { enhancedEsSearchStrategyProvider } from './es_search_strategy';
import { BehaviorSubject } from 'rxjs';

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
  const mockGetCaller = jest.fn();
  const mockSubmitCaller = jest.fn();
  const mockLogger: any = {
    debug: () => {},
  };
  const mockContext = {
    core: {
      uiSettings: {
        client: {
          get: jest.fn(),
        },
      },
      elasticsearch: {
        client: {
          asCurrentUser: {
            asyncSearch: {
              get: mockGetCaller,
              submit: mockSubmitCaller,
            },
            transport: { request: mockApiCaller },
          },
        },
      },
    },
  };
  const mockConfig$ = new BehaviorSubject<any>({
    elasticsearch: {
      shardTimeout: {
        asMilliseconds: () => {
          return 100;
        },
      },
    },
  });

  beforeEach(() => {
    mockApiCaller.mockClear();
  });

  it('returns a strategy with `search`', async () => {
    const esSearch = await enhancedEsSearchStrategyProvider(mockConfig$, mockLogger);

    expect(typeof esSearch.search).toBe('function');
  });

  it('makes a POST request to async search with params when no ID is provided', async () => {
    mockSubmitCaller.mockResolvedValueOnce(mockAsyncResponse);

    const params = { index: 'logstash-*', body: { query: {} } };
    const esSearch = await enhancedEsSearchStrategyProvider(mockConfig$, mockLogger);

    await esSearch.search((mockContext as unknown) as RequestHandlerContext, { params });

    expect(mockSubmitCaller).toBeCalled();
    const request = mockSubmitCaller.mock.calls[0][0];
    expect(request.index).toEqual(params.index);
    expect(request.body).toEqual(params.body);
  });

  it('makes a GET request to async search with ID when ID is provided', async () => {
    mockGetCaller.mockResolvedValueOnce(mockAsyncResponse);

    const params = { index: 'logstash-*', body: { query: {} } };
    const esSearch = await enhancedEsSearchStrategyProvider(mockConfig$, mockLogger);

    await esSearch.search((mockContext as unknown) as RequestHandlerContext, { id: 'foo', params });

    expect(mockGetCaller).toBeCalled();
    const request = mockGetCaller.mock.calls[0][0];
    expect(request.id).toEqual('foo');
    expect(request).toHaveProperty('wait_for_completion_timeout');
    expect(request).toHaveProperty('keep_alive');
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
    mockSubmitCaller.mockResolvedValueOnce(mockAsyncResponse);

    const params = { index: 'foo-*', body: {} };
    const esSearch = await enhancedEsSearchStrategyProvider(mockConfig$, mockLogger);

    await esSearch.search((mockContext as unknown) as RequestHandlerContext, { params });

    expect(mockSubmitCaller).toBeCalled();
    const request = mockSubmitCaller.mock.calls[0][0];
    expect(request).toHaveProperty('wait_for_completion_timeout');
    expect(request).toHaveProperty('keep_alive');
  });
});
