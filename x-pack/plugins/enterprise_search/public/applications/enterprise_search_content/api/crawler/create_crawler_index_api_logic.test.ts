/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { createCrawlerIndex } from './create_crawler_index_api_logic';

describe('CreateCrawlerIndexApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('createCrawlerIndex', () => {
    it('calls correct api', async () => {
      const indexName = 'elastic-co-crawler';
      const language = 'Universal';
      http.post.mockReturnValue(Promise.resolve({ created: indexName }));

      const result = createCrawlerIndex({ indexName, language });
      await nextTick();

      expect(http.post).toHaveBeenCalledWith('/internal/enterprise_search/crawler', {
        body: JSON.stringify({ index_name: indexName, language }),
      });
      await expect(result).resolves.toEqual({ created: indexName });
    });
  });
});
