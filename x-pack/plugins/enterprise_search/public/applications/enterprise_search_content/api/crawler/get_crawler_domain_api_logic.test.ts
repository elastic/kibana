/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { CRAWLER_DOMAIN_FROM_SERVER } from './_mocks_/crawler_domains.mock';
import { getCrawlerDomain } from './get_crawler_domain_api_logic';
import { crawlerDomainServerToClient } from './utils';

describe('GetCrawlerDomainApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('getCrawlerDomain', () => {
    it('calls correct api', async () => {
      const indexName = 'elastic-co-crawler';
      const domainId = CRAWLER_DOMAIN_FROM_SERVER.id;

      http.get.mockReturnValue(Promise.resolve(CRAWLER_DOMAIN_FROM_SERVER));

      const result = getCrawlerDomain({ domainId, indexName });
      await nextTick();

      expect(http.get).toHaveBeenCalledWith(
        `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}`
      );
      await expect(result).resolves.toEqual(
        crawlerDomainServerToClient(CRAWLER_DOMAIN_FROM_SERVER)
      );
    });
  });
});
