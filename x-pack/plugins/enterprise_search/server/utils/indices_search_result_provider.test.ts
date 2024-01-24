/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER, lastValueFrom } from 'rxjs';

import { getIndicesSearchResultProvider } from "./indices_search_result_provider";
import { IScopedClusterClient } from '@kbn/core/server';
import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '@kbn/enterprise-search-plugin/common/constants';

describe('Enterprise Search - indices search provider', () => {
  
  const indicesSearchResultProvider = getIndicesSearchResultProvider();
  
  const regularIndexResponse = {
    'search-github-api': {
      aliases: {},
    },
    'search-msft-sql-index': {
      aliases: {},
    }
  };

  const mockClient = {
    asCurrentUser: {
      count: jest.fn().mockReturnValue({ count: 100 }),
      indices: {
        get: jest.fn(),
        stats: jest.fn(),
      },
      security: {
        hasPrivileges: jest.fn(),
      },
    },
    asInternalUser: {},
  };
  const client = mockClient as unknown as IScopedClusterClient;
  mockClient.asCurrentUser.indices.get.mockResolvedValue(regularIndexResponse);

  const githubIndex = {
      id: 'search-github-api',
      score: 75,
      title: 'search-github-api',
      type: 'Index',
      url: {
        path: `${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}/search_indices/search-github-api`,
        prependBasePath: true,
      },
    };

  const msftIndex =  {
    id: 'search-msft-sql-index',
    score: 75,
    title: 'search-msft-sql-index',
    type: 'Index',
    url: {
      path: `${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}/search_indices/search-msft-sql-index`,
      prependBasePath: true,
    },
  };

  beforeEach(() => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('find', () => {
    it('returns formatted results', async () => {      
      const results = await lastValueFrom(indicesSearchResultProvider.find(
        { term: 'search-github-api' },
        { 
          aborted$: NEVER, 
          client, 
          maxResults: 100, 
          preference: ''
        },
        {} as any
      ));
      expect(results).toEqual([{...githubIndex, score: 100}]);
    });

    it('returns all matched results', async () => {
      const results = await lastValueFrom(indicesSearchResultProvider.find(
        { term: 'search' },
        { 
          aborted$: NEVER, 
          client, 
          maxResults: 100, 
          preference: ''
        },
        {} as any
      ));
      expect(results).toEqual([
        { ...githubIndex, score: 90 }, 
        { ...msftIndex, score: 90 },
      ]);
    });

    it('returns all indices on empty string', async () => {
      const results = await lastValueFrom(indicesSearchResultProvider.find(
        { term: '' },
        { 
          aborted$: NEVER, 
          client, 
          maxResults: 100, 
          preference: ''
        },
        {} as any
      ));
      expect(results).toEqual([
        { ...githubIndex, score: 80 },
        { ...msftIndex, score: 80 },
      ]);
    });

    it('respect maximum results', async () => {
      const results = await lastValueFrom(indicesSearchResultProvider.find(
        { term: 'search' },
        { 
          aborted$: NEVER, 
          client, 
          maxResults: 1, 
          preference: ''
        },
        {} as any
      ));
      expect(results).toEqual([
        { ...githubIndex, score: 90 },
      ]);
    });

    describe('returns empty results', () => {
      it('when term does not match with created indices', async () => {        
        const results = await lastValueFrom(indicesSearchResultProvider.find(
          { term: 'sample' },
          { 
            aborted$: NEVER, 
            client, 
            maxResults: 100, 
            preference: ''
          },
          {} as any
        ));
        expect(results).toEqual([]);
      });

      it('if client is undefined', async () => {        
        const results = await lastValueFrom(indicesSearchResultProvider.find(
          { term: 'sample' },
          { 
            aborted$: NEVER, 
            client: undefined, 
            maxResults: 100, 
            preference: ''
          },
          {} as any
        ));
        expect(results).toEqual([]);
      });

      it('if tag is specified', async () => {        
        const results = await lastValueFrom(indicesSearchResultProvider.find(
          { term: 'search', tags: ['tag'] },
          { 
            aborted$: NEVER, 
            client, 
            maxResults: 100, 
            preference: ''
          },
          {} as any
        ));
        expect(results).toEqual([]);
      });

      it('if unknown type is specified', async () => {        
        const results = await lastValueFrom(indicesSearchResultProvider.find(
          { term: 'search', types: ['tag'] },
          { 
            aborted$: NEVER, 
            client, 
            maxResults: 100, 
            preference: ''
          },
          {} as any
        ));
        expect(results).toEqual([]);
      });
    });
  });
});