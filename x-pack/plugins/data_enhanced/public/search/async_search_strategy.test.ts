/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { AbortController } from 'abort-controller';
import { coreMock } from '../../../../../src/core/public/mocks';
import { asyncSearchStrategyProvider } from './async_search_strategy';
import { IAsyncSearchOptions } from './types';
import { CoreStart } from 'kibana/public';

describe('Async search strategy', () => {
  let mockCoreStart: MockedKeys<CoreStart>;
  const mockSearch = jest.fn();
  const mockRequest = { params: {}, serverStrategy: 'foo' };
  const mockOptions: IAsyncSearchOptions = { pollInterval: 0 };

  beforeEach(() => {
    mockCoreStart = coreMock.createStart();
    mockSearch.mockReset();
  });

  it('only sends one request if the first response is complete', async () => {
    mockSearch.mockReturnValueOnce(of({ id: 1, total: 1, loaded: 1 }));

    const asyncSearch = asyncSearchStrategyProvider({
      core: mockCoreStart,
      getSearchStrategy: jest.fn().mockImplementation(() => {
        return () => {
          return {
            search: mockSearch,
          };
        };
      }),
    });

    await asyncSearch.search(mockRequest, mockOptions).toPromise();

    expect(mockSearch.mock.calls[0][0]).toEqual(mockRequest);
    expect(mockSearch.mock.calls[0][1]).toEqual({});
    expect(mockSearch).toBeCalledTimes(1);
  });

  it('stops polling when the response is complete', async () => {
    mockSearch
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 1, is_running: true, is_partial: true }))
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 2, is_running: false, is_partial: false }))
      .mockReturnValueOnce(
        of({ id: 1, total: 2, loaded: 2, is_running: false, is_partial: false })
      );

    const asyncSearch = asyncSearchStrategyProvider({
      core: mockCoreStart,
      getSearchStrategy: jest.fn().mockImplementation(() => {
        return () => {
          return {
            search: mockSearch,
          };
        };
      }),
    });

    expect(mockSearch).toBeCalledTimes(0);

    await asyncSearch.search(mockRequest, mockOptions).toPromise();

    expect(mockSearch).toBeCalledTimes(2);
  });

  it('stops polling when the response is an error', async () => {
    mockSearch
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 1, is_running: true, is_partial: true }))
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 2, is_running: false, is_partial: true }))
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 2, is_running: false, is_partial: true }));

    const asyncSearch = asyncSearchStrategyProvider({
      core: mockCoreStart,
      getSearchStrategy: jest.fn().mockImplementation(() => {
        return () => {
          return {
            search: mockSearch,
          };
        };
      }),
    });

    expect(mockSearch).toBeCalledTimes(0);

    await asyncSearch
      .search(mockRequest, mockOptions)
      .toPromise()
      .catch(() => {
        expect(mockSearch).toBeCalledTimes(2);
      });
  });

  // For bug fixed in https://github.com/elastic/kibana/pull/64155
  it('Continues polling if no records are returned on first async request', async () => {
    mockSearch
      .mockReturnValueOnce(of({ id: 1, total: 0, loaded: 0, is_running: true, is_partial: true }))
      .mockReturnValueOnce(
        of({ id: 1, total: 2, loaded: 2, is_running: false, is_partial: false })
      );

    const asyncSearch = asyncSearchStrategyProvider({
      core: mockCoreStart,
      getSearchStrategy: jest.fn().mockImplementation(() => {
        return () => {
          return {
            search: mockSearch,
          };
        };
      }),
    });

    expect(mockSearch).toBeCalledTimes(0);

    await asyncSearch.search(mockRequest, mockOptions).toPromise();

    expect(mockSearch).toBeCalledTimes(2);
    expect(mockSearch.mock.calls[0][0]).toEqual(mockRequest);
    expect(mockSearch.mock.calls[1][0]).toEqual({ id: 1, serverStrategy: 'foo' });
  });

  it('only sends the ID and server strategy after the first request', async () => {
    mockSearch
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 1, is_running: true, is_partial: true }))
      .mockReturnValueOnce(
        of({ id: 1, total: 2, loaded: 2, is_running: false, is_partial: false })
      );

    const asyncSearch = asyncSearchStrategyProvider({
      core: mockCoreStart,
      getSearchStrategy: jest.fn().mockImplementation(() => {
        return () => {
          return {
            search: mockSearch,
          };
        };
      }),
    });

    expect(mockSearch).toBeCalledTimes(0);

    await asyncSearch.search(mockRequest, mockOptions).toPromise();

    expect(mockSearch).toBeCalledTimes(2);
    expect(mockSearch.mock.calls[0][0]).toEqual(mockRequest);
    expect(mockSearch.mock.calls[1][0]).toEqual({ id: 1, serverStrategy: 'foo' });
  });

  it('sends a DELETE request and stops polling when the signal is aborted', async () => {
    mockSearch
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 1 }))
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 2 }))
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 2 }));

    const asyncSearch = asyncSearchStrategyProvider({
      core: mockCoreStart,
      getSearchStrategy: jest.fn().mockImplementation(() => {
        return () => {
          return {
            search: mockSearch,
          };
        };
      }),
    });
    const abortController = new AbortController();
    const options = { ...mockOptions, signal: abortController.signal };

    const promise = asyncSearch.search(mockRequest, options).toPromise();
    abortController.abort();

    try {
      await promise;
    } catch (e) {
      expect(e.name).toBe('AbortError');
      expect(mockSearch).toBeCalledTimes(1);
      expect(mockCoreStart.http.delete).toBeCalled();
    }
  });
});
