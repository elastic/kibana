/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { CoreSetup } from '../../../../../src/core/public';
import { coreMock } from '../../../../../src/core/public/mocks';
import { asyncSearchStrategyProvider, IAsyncSearchOptions } from './async_search_strategy';

describe('Async search strategy', () => {
  let mockCoreSetup: MockedKeys<CoreSetup>;
  const mockSearch = jest.fn();
  const mockRequest = { params: {}, serverStrategy: 'foo' };
  const mockOptions = { pollInterval: 0 };

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockSearch.mockReset();
  });

  it('only sends one request if the first response is complete', async () => {
    mockSearch.mockReturnValueOnce(of({ id: 1, total: 1, loaded: 1 }));

    const asyncSearch = asyncSearchStrategyProvider({ core: mockCoreSetup }, mockSearch);

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

    const asyncSearch = asyncSearchStrategyProvider({ core: mockCoreSetup }, mockSearch);

    expect(mockSearch).toBeCalledTimes(0);

    await asyncSearch.search(mockRequest, mockOptions).toPromise();

    expect(mockSearch).toBeCalledTimes(2);
  });

  it('only sends the ID and server strategy after the first request', async () => {
    mockSearch
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 1 }))
      .mockReturnValueOnce(of({ id: 1, total: 2, loaded: 2 }));

    const asyncSearch = asyncSearchStrategyProvider({ core: mockCoreSetup }, mockSearch);

    expect(mockSearch).toBeCalledTimes(0);

    await asyncSearch.search(mockRequest, mockOptions).toPromise();

    expect(mockSearch).toBeCalledTimes(2);
    expect(mockSearch.mock.calls[0][0]).toEqual(mockRequest);
    expect(mockSearch.mock.calls[1][0]).toEqual({ id: 1, serverStrategy: 'foo' });
  });
});
