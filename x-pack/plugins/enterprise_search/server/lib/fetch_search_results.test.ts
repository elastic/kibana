/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { fetchSearchResults } from './fetch_search_results';

describe('fetchSearchResults lib function', () => {
  const mockClient = {
    asCurrentUser: {
      search: jest.fn(),
    },
  };

  const indexName = 'search-regular-index';
  const query = 'banana';

  const regularSearchResultsResponse = {};

  const emptyMappingResponse = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return regular mapping information', async () => {
    mockClient.asCurrentUser.search.mockImplementation(() => regularSearchResultsResponse);

    await expect(
      fetchSearchResults(mockClient as unknown as IScopedClusterClient, indexName, query)
    ).resolves.toEqual({
      mappings: {
        dynamic: true,
        dynamic_templates: [],
        properties: {},
      },
    });

    expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
      index: indexName,
      q: query,
    });
  });

  it('should return empty object when no mapping is found', async () => {
    mockClient.asCurrentUser.search.mockImplementationOnce(() => emptyMappingResponse);

    await expect(
      fetchSearchResults(mockClient as unknown as IScopedClusterClient, indexName, query)
    ).resolves.toEqual({});

    expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
      index: indexName,
      q: query,
    });
  });
});
