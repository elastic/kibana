/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { createCrawlerIndex } from './create_crawler_index_api_logic';
import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '@kbn/enterprise-search-plugin/common/constants';

describe('CreateCrawlerIndexApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('createCrawlerIndex', () => {
    it('calls correct api', async () => {
      const indexName = 'elastic-co-crawler';
      const language = 'Universal';
      const promise = Promise.resolve({ updated: indexName });
      http.post.mockReturnValue(Promise.resolve());
      http.put.mockReturnValue(promise);

      const result = createCrawlerIndex({ indexName, language });
      await nextTick();

      expect(http.post).toHaveBeenCalledWith('/internal/enterprise_search/connectors', {
        body: JSON.stringify({
          delete_existing_connector: true,
          index_name: indexName,
          service_type: ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE,
          is_native: true,
          language,
        }),
      });
      expect(http.put).toHaveBeenCalledWith(`/internal/enterprise_search/crawler/${indexName}`, {
        body: JSON.stringify({ language }),
      });
      await expect(result).resolves.toEqual({ updated: indexName });
    });
  });
});
