/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { searchDocuments } from './search_documents_api_logic';

describe('SearchDocumentsApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('searchDocuments', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.post.mockReturnValue(promise);
      const result = searchDocuments({
        indexName: 'indexName',
        pagination: {
          pageIndex: 0,
          pageSize: 10,
        },
      });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith(
        '/internal/enterprise_search/indices/indexName/search',
        {
          body: JSON.stringify({}),
          query: { page: 0, size: 10 },
        }
      );
      await expect(result).resolves.toEqual('result');
    });
    it('calls correct api with query set', async () => {
      const promise = Promise.resolve('result');
      http.post.mockReturnValue(promise);
      const result = searchDocuments({
        indexName: 'düsseldorf',
        pagination: {
          pageIndex: 0,
          pageSize: 10,
        },
        query: 'abcd',
      });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith(
        '/internal/enterprise_search/indices/d%C3%BCsseldorf/search',
        {
          body: JSON.stringify({
            searchQuery: 'abcd',
          }),
          query: { page: 0, size: 10 },
        }
      );
      await expect(result).resolves.toEqual('result');
    });
    it('calls with correct pageSize with docsPerPage set', async () => {
      const promise = Promise.resolve('result');
      http.post.mockReturnValue(promise);
      const result = searchDocuments({
        docsPerPage: 25,
        indexName: 'indexName',
        pagination: {
          pageIndex: 0,
          pageSize: 10,
        },
      });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith(
        '/internal/enterprise_search/indices/indexName/search',
        {
          body: JSON.stringify({}),
          query: { page: 0, size: 25 },
        }
      );
      await expect(result).resolves.toEqual('result');
    });
  });
});
