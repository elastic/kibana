/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { CRAWLER_DOMAINS_WITH_META_FROM_SERVER, META } from './_mocks_/crawler_domains.mock';
import { getCrawlerDomains } from './get_crawler_domains_api_logic';
import { crawlerDomainsWithMetaServerToClient } from './utils';

describe('GetCrawlerDomainsApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('getCrawlerDomains', () => {
    it('calls correct api', async () => {
      const indexName = 'elastic-co-crawler';

      http.get.mockReturnValue(Promise.resolve(CRAWLER_DOMAINS_WITH_META_FROM_SERVER));

      const result = getCrawlerDomains({ indexName, meta: META });
      await nextTick();

      expect(http.get).toHaveBeenCalledWith(
        `/internal/enterprise_search/indices/${indexName}/crawler/domains`,
        {
          query: {
            'page[current]': META.page.current,
            'page[size]': META.page.size,
          },
        }
      );
      await expect(result).resolves.toEqual(
        crawlerDomainsWithMetaServerToClient(CRAWLER_DOMAINS_WITH_META_FROM_SERVER)
      );
    });
  });
});
