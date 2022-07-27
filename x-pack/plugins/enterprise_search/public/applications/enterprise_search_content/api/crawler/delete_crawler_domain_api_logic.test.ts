/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { CRAWLER_DOMAIN } from './_mocks_/crawler_domains.mock';
import { deleteCrawlerDomain } from './delete_crawler_domain_api_logic';

describe('DeleteCrawlerDomainApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('deleteCrawlerDomain', () => {
    it('calls correct api', async () => {
      const indexName = 'elastic-co-crawler';
      http.post.mockReturnValue(Promise.resolve());

      const result = deleteCrawlerDomain({ domain: CRAWLER_DOMAIN, indexName });
      await nextTick();
      expect(http.delete).toHaveBeenCalledWith(
        `/internal/enterprise_search/indices/elastic-co-crawler/crawler/domains/${CRAWLER_DOMAIN.id}`
      );
      await expect(result).resolves.toEqual({ domain: CRAWLER_DOMAIN });
    });
  });
});
