/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { AbortController } from 'abort-controller';
import { CoreSetup } from '../../../../../src/core/public';
import { coreMock } from '../../../../../src/core/public/mocks';
import { DataPublicPluginSetup } from '../../../../../src/plugins/data/public';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { asyncSearchStrategyProvider } from './async_search_strategy';

describe('Async search strategy', () => {
  let mockCoreSetup: MockedKeys<CoreSetup>;
  let mockDataSetup: MockedKeys<DataPublicPluginSetup>;
  const mockSearch = jest.fn();
  const mockRequest = { params: {}, serverStrategy: 'foo' };
  const mockOptions = { pollInterval: 0 };

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockDataSetup = dataPluginMock.createSetupContract();
    mockDataSetup.search.getSearchStrategy.mockReturnValue({ search: mockSearch });
    mockSearch.mockReset();
  });

  it('only sends one request if the first response is complete', async () => {
    mockSearch.mockReturnValueOnce(of({ id: 1, total: 1, loaded: 1 }));

    const asyncSearch = asyncSearchStrategyProvider(mockCoreSetup, mockDataSetup);

    await asyncSearch.search(mockRequest, mockOptions).toPromise();

    expect(mockSearch.mock.calls[0][0]).toEqual(mockRequest);
    expect(mockSearch.mock.calls[0][1]).toEqual({});
    expect(mockSearch).toBeCalledTimes(1);
  });

  it('stops polling when the response is complete', async () => {
    mockSearch
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 1 }))
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 2 }))
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 2 }));

    const asyncSearch = asyncSearchStrategyProvider(mockCoreSetup, mockDataSetup);

    expect(mockSearch).toBeCalledTimes(0);

    await asyncSearch.search(mockRequest, mockOptions).toPromise();

    expect(mockSearch).toBeCalledTimes(2);
  });

  it('only sends the ID and server strategy after the first request', async () => {
    mockSearch
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 1 }))
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 2 }));

    const asyncSearch = asyncSearchStrategyProvider(mockCoreSetup, mockDataSetup);

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

    const asyncSearch = asyncSearchStrategyProvider(mockCoreSetup, mockDataSetup);
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
