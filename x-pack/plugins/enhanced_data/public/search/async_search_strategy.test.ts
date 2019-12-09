/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { CoreSetup } from '../../../../../src/core/public';
import { coreMock } from '../../../../../src/core/public/mocks';
import { asyncSearchStrategyProvider } from './async_search_strategy';

jest.useFakeTimers();

describe('Async search strategy', () => {
  let mockCoreSetup: MockedKeys<CoreSetup>;
  const mockSearch = jest.fn();

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockSearch.mockClear();
  });

  it('only sends one request if the first response is complete', async () => {
    const request = { params: {}, serverStrategy: 'foo' };
    const options = {};

    mockSearch.mockReturnValueOnce(
      of({
        id: 1,
        total: 1,
        loaded: 1,
      })
    );

    const asyncSearch = asyncSearchStrategyProvider(
      {
        core: mockCoreSetup,
      },
      mockSearch
    );

    await asyncSearch.search(request, options).toPromise();
    jest.runAllTimers();

    expect(mockSearch.mock.calls[0][0]).toEqual(request);
    expect(mockSearch.mock.calls[0][1]).toEqual(options);
    expect(mockSearch).toBeCalledTimes(1);
  });

  // it('polls using the given interval', done => {
  //   const request = { params: {}, serverStrategy: 'foo' };
  //   const pollInterval = 100;
  //   const options = { pollInterval };
  //
  //   mockSearch
  //     .mockReturnValueOnce(
  //       of({
  //         id: 1,
  //         total: 2,
  //         loaded: 1,
  //       })
  //     )
  //     .mockReturnValueOnce(
  //       of({
  //         id: 1,
  //         total: 2,
  //         loaded: 2,
  //       })
  //     );
  //
  //   const asyncSearch = asyncSearchStrategyProvider(
  //     {
  //       core: mockCoreSetup,
  //     },
  //     mockSearch
  //   );
  //
  //   expect(mockSearch).toBeCalledTimes(0);
  //
  //   asyncSearch.search(request, options).subscribe(
  //     () => {
  //       jest.advanceTimersByTime(pollInterval);
  //     },
  //     () => {},
  //     () => {
  //       done();
  //     }
  //   );
  // });

  // it('continues polling until it reaches 100% complete');

  // it('only sends the ID and server strategy after the first request');
});
