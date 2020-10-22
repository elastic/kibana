/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, RequestHandlerContext } from 'src/core/server';
import { EqlSearchStrategyRequest } from '../../common/search/types';
import { eqlSearchStrategyProvider } from './eql_search_strategy';

const getMockEqlResponse = () => ({
  body: {
    is_partial: false,
    is_running: false,
    took: 162,
    timed_out: false,
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      sequences: [],
    },
  },
});

describe('EQL search strategy', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = ({ debug: jest.fn() } as unknown) as Logger;
  });

  describe('strategy interface', () => {
    it('returns a strategy with a `search` function', async () => {
      const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
      expect(typeof eqlSearch.search).toBe('function');
    });

    it('returns a strategy with a `cancel` function', async () => {
      const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
      expect(typeof eqlSearch.cancel).toBe('function');
    });
  });

  describe('search()', () => {
    let mockEqlSearch: jest.Mock;
    let mockEqlGet: jest.Mock;
    let mockContext: RequestHandlerContext;
    let params: Required<EqlSearchStrategyRequest>['params'];
    let options: Required<EqlSearchStrategyRequest>['options'];

    beforeEach(() => {
      mockEqlSearch = jest.fn().mockResolvedValueOnce(getMockEqlResponse());
      mockEqlGet = jest.fn().mockResolvedValueOnce(getMockEqlResponse());
      mockContext = ({
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
      params = {
        index: 'logstash-*',
        body: { query: 'process where 1 == 1' },
      };
      options = { ignore: [400] };
    });

    describe('async functionality', () => {
      it('performs an eql client search with params when no ID is provided', async () => {
        const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
        await eqlSearch.search({ options, params }, {}, mockContext).toPromise();
        const [[request, requestOptions]] = mockEqlSearch.mock.calls;

        expect(request.index).toEqual('logstash-*');
        expect(request.body).toEqual(expect.objectContaining({ query: 'process where 1 == 1' }));
        expect(requestOptions).toEqual(expect.objectContaining({ ignore: [400] }));
      });

      it('retrieves the current request if an id is provided', async () => {
        const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
        await eqlSearch.search({ id: 'my-search-id' }, {}, mockContext).toPromise();
        const [[requestParams]] = mockEqlGet.mock.calls;

        expect(mockEqlSearch).not.toHaveBeenCalled();
        expect(requestParams).toEqual(expect.objectContaining({ id: 'my-search-id' }));
      });

      it('emits an error if the client throws', async () => {
        expect.assertions(1);
        mockEqlSearch.mockReset().mockRejectedValueOnce(new Error('client error'));
        const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
        eqlSearch.search({ options, params }, {}, mockContext).subscribe(
          () => {},
          (err) => {
            expect(err).toEqual(new Error('client error'));
          }
        );
      });
    });

    describe('arguments', () => {
      it('sends along async search options', async () => {
        const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
        await eqlSearch.search({ options, params }, {}, mockContext).toPromise();
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
        await eqlSearch.search({ options, params }, {}, mockContext).toPromise();
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
        await eqlSearch
          .search(
            {
              options,
              params: {
                ...params,
                wait_for_completion_timeout: '5ms',
                keep_on_completion: false,
              },
            },
            {},
            mockContext
          )
          .toPromise();
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
        await eqlSearch
          .search(
            {
              options: { ...options, maxRetries: 2, ignore: [300] },
              params,
            },
            {},
            mockContext
          )
          .toPromise();
        const [[, requestOptions]] = mockEqlSearch.mock.calls;

        expect(requestOptions).toEqual(
          expect.objectContaining({
            max_retries: 2,
            ignore: [300],
          })
        );
      });

      it('passes transport options for an existing request', async () => {
        const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
        await eqlSearch
          .search({ id: 'my-search-id', options: { ignore: [400] } }, {}, mockContext)
          .toPromise();
        const [[, requestOptions]] = mockEqlGet.mock.calls;

        expect(mockEqlSearch).not.toHaveBeenCalled();
        expect(requestOptions).toEqual(expect.objectContaining({ ignore: [400] }));
      });
    });
  });
});
