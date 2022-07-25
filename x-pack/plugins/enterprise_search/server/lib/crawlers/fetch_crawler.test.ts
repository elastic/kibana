/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CRAWLERS_INDEX } from '../..';

import { fetchCrawler } from './fetch_crawler';

describe('fetch crawler', () => {
  const mockClient = {
    asCurrentUser: {
      search: jest.fn(),
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch crawler by index name', async () => {
    mockClient.asCurrentUser.search.mockImplementationOnce(() =>
      Promise.resolve({ hits: { hits: [{ _id: 'crawlerId', _source: { source: 'source' } }] } })
    );
    await expect(fetchCrawler(mockClient as any, 'id')).resolves.toEqual({
      source: 'source',
    });
    expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
      index: CRAWLERS_INDEX,
      query: {
        term: {
          ['index_name']: 'id',
        },
      },
    });
  });
  it('should return undefined on error', async () => {
    mockClient.asCurrentUser.search.mockImplementationOnce(() => Promise.reject());
    await expect(fetchCrawler(mockClient as any, 'id')).resolves.toEqual(undefined);
    expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
      index: CRAWLERS_INDEX,
      query: {
        term: {
          ['index_name']: 'id',
        },
      },
    });
  });
});
