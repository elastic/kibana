/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { recreateCrawlerConnector } from './recreate_crawler_connector_api_logic';

describe('CreateCrawlerIndexApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('createCrawlerIndex', () => {
    it('calls correct api', async () => {
      const indexName = 'elastic-co-crawler';
      http.post.mockReturnValue(Promise.resolve({ connector_id: 'connectorId' }));

      const result = recreateCrawlerConnector({ indexName });
      await nextTick();

      expect(http.post).toHaveBeenCalledWith(
        '/internal/enterprise_search/indices/elastic-co-crawler/crawler/connector'
      );
      await expect(result).resolves.toEqual({ connector_id: 'connectorId' });
    });
  });
});
