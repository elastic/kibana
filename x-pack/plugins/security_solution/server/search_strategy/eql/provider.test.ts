/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, RequestHandlerContext } from 'src/core/server';
import { EqlSearchStrategyRequest } from '../../../common/search_strategy/eql';
import { getValidEqlResponse } from '../../../common/search_strategy/eql/validation/helpers.mock';
import { eqlSearchStrategyProvider } from './provider';

describe('EQL search strategy', () => {
  const mockEqlSearch = jest.fn();
  const mockEqlGet = jest.fn();
  const mockLogger = ({
    debug: () => {},
  } as unknown) as Logger;
  const mockContext = ({
    core: {
      uiSettings: {
        client: {
          get: jest.fn(),
        },
      },
      elasticsearch: {
        client: {
          asCurrentUser: {
            eql: {
              get: mockEqlGet,
              search: mockEqlSearch,
            },
          },
        },
      },
    },
  } as unknown) as RequestHandlerContext;
  const params: EqlSearchStrategyRequest['params'] = {
    index: 'logstash-*',
    body: { query: 'process where 1 == 1' },
  };
  const options: EqlSearchStrategyRequest['options'] = { ignore: [400] };

  beforeEach(() => {
    mockEqlSearch.mockClear();
    mockEqlSearch.mockResolvedValueOnce({ body: getValidEqlResponse() });
  });

  it('returns a strategy with `search`', async () => {
    const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
    expect(typeof eqlSearch.search).toBe('function');
  });

  it('returns a strategy with `cancel`', async () => {
    const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
    expect(typeof eqlSearch.cancel).toBe('function');
  });

  describe('async functionality', () => {
    it('performs an eql client search with params when no ID is provided', async () => {
      const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
      await eqlSearch.search(mockContext, { options, params });
      const [[request, requestOptions]] = mockEqlSearch.mock.calls;

      expect(request.index).toEqual(params.index);
      expect(request.body).toEqual(params.body);
      expect(requestOptions).toEqual(options);
    });

    it('retrieves the current request if an id is provided', async () => {
      mockEqlGet.mockResolvedValueOnce({ body: getValidEqlResponse() });
      const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
      await eqlSearch.search(mockContext, { id: 'my-search-id' });
      const [[requestParams]] = mockEqlGet.mock.calls;

      expect(mockEqlSearch).not.toHaveBeenCalled();
      expect(requestParams).toEqual(expect.objectContaining({ id: 'my-search-id' }));
    });
  });

  describe('search arguments', () => {
    it('sends along async search options', async () => {
      const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
      await eqlSearch.search(mockContext, { options, params });
      const [[request]] = mockEqlSearch.mock.calls;

      expect(request).toEqual(
        expect.objectContaining({
          wait_for_completion_timeout: '100ms',
          keep_alive: '1m',
        })
      );
    });

    it('sends along default search parameters', async () => {
      const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
      await eqlSearch.search(mockContext, { options, params });
      const [[request]] = mockEqlSearch.mock.calls;

      expect(request).toEqual(
        expect.objectContaining({
          ignore_unavailable: true,
          ignore_throttled: true,
        })
      );
    });

    it('allows search parameters to be overridden', async () => {
      const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
      await eqlSearch.search(mockContext, {
        options,
        params: {
          ...params,
          wait_for_completion_timeout: '5ms',
          keep_on_completion: false,
        },
      });
      const [[request]] = mockEqlSearch.mock.calls;

      expect(request).toEqual(
        expect.objectContaining({
          wait_for_completion_timeout: '5ms',
          keep_alive: '1m',
          keep_on_completion: false,
        })
      );
    });

    it('allows search options to be overridden', async () => {
      const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
      await eqlSearch.search(mockContext, {
        options: { ...options, maxRetries: 2, ignore: [300] },
        params,
      });
      const [[, requestOptions]] = mockEqlSearch.mock.calls;

      expect(requestOptions).toEqual(
        expect.objectContaining({
          max_retries: 2,
          ignore: [300],
        })
      );
    });
  });
});
