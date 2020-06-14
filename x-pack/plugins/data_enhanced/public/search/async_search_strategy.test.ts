/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { AbortController } from 'abort-controller';
import { CoreSetup } from '../../../../../src/core/public';
import { coreMock } from '../../../../../src/core/public/mocks';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { asyncSearchStrategyProvider } from './async_search_strategy';
import { IAsyncSearchOptions } from '.';
import { DataEnhancedStartDependencies } from '../plugin';

describe('Async search strategy', () => {
  let mockCoreSetup: jest.Mocked<CoreSetup<DataEnhancedStartDependencies>>;
  let mockDataStart: jest.Mocked<DataPublicPluginStart>;
  const mockSearch = jest.fn();
  const mockRequest = { params: {}, serverStrategy: 'foo' };
  const mockOptions: IAsyncSearchOptions = { pollInterval: 0 };

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockDataStart = dataPluginMock.createStartContract();
    (mockDataStart.search.getSearchStrategy as jest.Mock).mockReturnValue({ search: mockSearch });

    mockCoreSetup.getStartServices.mockResolvedValue([
      undefined as any,
      { data: mockDataStart },
      undefined,
    ]);
    mockSearch.mockReset();
  });

  it('only sends one request if the first response is complete', async () => {
    mockSearch.mockReturnValueOnce(of({ id: 1, total: 1, loaded: 1 }));

    const asyncSearch = asyncSearchStrategyProvider(mockCoreSetup);

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

    const asyncSearch = asyncSearchStrategyProvider(mockCoreSetup);
    expect(mockSearch).toBeCalledTimes(0);

    await asyncSearch.search(mockRequest, mockOptions).toPromise();

    expect(mockSearch).toBeCalledTimes(2);
  });

  it('stops polling when the response is an error', async () => {
    mockSearch
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 1, is_running: true, is_partial: true }))
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 2, is_running: false, is_partial: true }))
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 2, is_running: false, is_partial: true }));

    const asyncSearch = asyncSearchStrategyProvider(mockCoreSetup);
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

    const asyncSearch = asyncSearchStrategyProvider(mockCoreSetup);

    expect(mockSearch).toBeCalledTimes(0);

    await asyncSearch.search(mockRequest, mockOptions).toPromise();

    expect(mockDataStart.search.getSearchStrategy).toBeCalledTimes(1);
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

    const asyncSearch = asyncSearchStrategyProvider(mockCoreSetup);

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

    const asyncSearch = asyncSearchStrategyProvider(mockCoreSetup);
    const abortController = new AbortController();
    const options = { ...mockOptions, signal: abortController.signal };

    const promise = asyncSearch.search(mockRequest, options).toPromise();
    abortController.abort();

    try {
      await promise;
    } catch (e) {
      expect(e.name).toBe('AbortError');
      expect(mockSearch).toBeCalledTimes(1);
      expect(mockCoreSetup.http.delete).toBeCalled();
    }
  });
});
