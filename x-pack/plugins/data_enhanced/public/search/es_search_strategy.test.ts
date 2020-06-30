/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from '../../../../../src/core/public';
import { coreMock } from '../../../../../src/core/public/mocks';
import { ES_SEARCH_STRATEGY } from '../../../../../src/plugins/data/common';
import { enhancedEsSearchStrategyProvider } from './es_search_strategy';
import { IAsyncSearchOptions } from '.';

describe('Enhanced ES search strategy', () => {
  let mockCoreSetup: jest.Mocked<CoreSetup>;
  const mockSearch = { search: jest.fn() };

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockSearch.search.mockClear();
  });

  it('returns a strategy with `search` that calls the async search `search`', () => {
    const request = { params: {} };
    const options: IAsyncSearchOptions = { pollInterval: 0 };

    const esSearch = enhancedEsSearchStrategyProvider(mockCoreSetup, mockSearch);
    esSearch.search(request, options);

    expect(mockSearch.search.mock.calls[0][0]).toEqual({
      ...request,
      serverStrategy: ES_SEARCH_STRATEGY,
    });
    expect(mockSearch.search.mock.calls[0][1]).toEqual(options);
  });
});
