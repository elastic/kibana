/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';

import { ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT } from '../../common/constants';

import { fetchSearchResults } from './fetch_search_results';

const DEFAULT_FROM_VALUE = 0;
describe('fetchSearchResults lib function', () => {
  const mockClient = {
    asCurrentUser: {
      search: jest.fn(),
    },
  };

  const indexName = 'search-regular-index';
  const query = 'banana';

  const regularSearchResultsResponse = {
    took: 4,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: null,
      hits: [
        {
          _index: 'search-regular-index',
          _id: '5a12292a0f5ae10021650d7e',
          _score: 4.437291,
          _source: {
            name: 'banana',
            id: '5a12292a0f5ae10021650d7e',
          },
        },
      ],
    },
  };

  const emptySearchResultsResponse = {
    took: 4,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 0,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return search results with hits', async () => {
    mockClient.asCurrentUser.search.mockImplementation(
      () => regularSearchResultsResponse as SearchResponseBody
    );

    await expect(
      fetchSearchResults(mockClient as unknown as IScopedClusterClient, indexName, query)
    ).resolves.toEqual(regularSearchResultsResponse);

    expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
      from: DEFAULT_FROM_VALUE,
      index: indexName,
      q: JSON.stringify(query),
      size: ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT,
    });
  });

  it('should return search results with hits when no query is passed', async () => {
    mockClient.asCurrentUser.search.mockImplementation(
      () => regularSearchResultsResponse as SearchResponseBody
    );

    await expect(
      fetchSearchResults(mockClient as unknown as IScopedClusterClient, indexName)
    ).resolves.toEqual(regularSearchResultsResponse);

    expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
      from: DEFAULT_FROM_VALUE,
      index: indexName,
      size: ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT,
    });
  });

  it('should return empty search results', async () => {
    mockClient.asCurrentUser.search.mockImplementationOnce(
      () => emptySearchResultsResponse as SearchResponseBody
    );

    await expect(
      fetchSearchResults(mockClient as unknown as IScopedClusterClient, indexName, query)
    ).resolves.toEqual(emptySearchResultsResponse);

    expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
      from: DEFAULT_FROM_VALUE,
      index: indexName,
      q: JSON.stringify(query),
      size: ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT,
    });
  });
});
