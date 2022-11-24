/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { Actions } from '../../../../shared/api_logic/create_api_logic';
import { flashAPIErrors, flashSuccessToast } from '../../../../shared/flash_messages';
import { HttpLogic } from '../../../../shared/http';
import { GetCrawlerApiLogic, GetCrawlerArgs } from '../../../api/crawler/get_crawler_api_logic';
import {
  CrawlerData,
  CrawlerDomain,
  CrawlerStatus,
  CrawlEvent,
  CrawlRequest,
} from '../../../api/crawler/types';
import { IndexNameLogic } from '../index_name_logic';

export interface CrawlRequestOverrides {
  domain_allowlist?: string[];
  max_crawl_depth?: number;
  seed_urls?: string[];
  sitemap_discovery_disabled?: boolean;
  sitemap_urls?: string[];
}

export interface CrawlerValues {
  data: CrawlerData | null;
  dataLoading: boolean;
  domains: CrawlerDomain[];
  events: CrawlEvent[];
  mostRecentCrawlRequest: CrawlRequest | null;
  mostRecentCrawlRequestStatus: CrawlerStatus | null;
  timeoutId: NodeJS.Timeout | null;
}

export type CrawlerActions = Pick<
  Actions<GetCrawlerArgs, CrawlerData>,
  'apiError' | 'apiSuccess'
> & {
  createNewTimeoutForCrawlerData(duration: number): { duration: number };
  fetchCrawlerData(): void;
  onCreateNewTimeout(timeoutId: NodeJS.Timeout): { timeoutId: NodeJS.Timeout };
  reApplyCrawlRules(domain?: CrawlerDomain): { domain?: CrawlerDomain };
  startCrawl(overrides?: CrawlRequestOverrides): { overrides?: CrawlRequestOverrides };
  stopCrawl(): void;
};

export const CrawlerLogic = kea<MakeLogicType<CrawlerValues, CrawlerActions>>({
  actions: {
    fetchCrawlerData: true,
    reApplyCrawlRules: (domain) => ({ domain }),
    startCrawl: (overrides) => ({ overrides }),
    stopCrawl: () => null,
  },
  connect: {
    actions: [GetCrawlerApiLogic, ['apiError', 'apiSuccess']],
    values: [GetCrawlerApiLogic, ['status', 'data']],
  },
  listeners: ({ actions }) => ({
    apiError: (error) => {
      flashAPIErrors(error);
    },
    fetchCrawlerData: () => {
      const { indexName } = IndexNameLogic.values;

      GetCrawlerApiLogic.actions.makeRequest({ indexName });
    },
    reApplyCrawlRules: async ({ domain }) => {
      const { indexName } = IndexNameLogic.values;
      const { http } = HttpLogic.values;
      const requestBody: { domains?: string[] } = {};

      if (domain) {
        requestBody.domains = [domain.url];
      }

      try {
        await http.post(`/internal/enterprise_search/indices/${indexName}/crawler/process_crawls`, {
          body: JSON.stringify(requestBody),
        });

        flashSuccessToast(
          i18n.translate(
            'xpack.enterpriseSearch.crawler.manageCrawlsPopover.reApplyCrawlRules.successMessage',
            {
              defaultMessage: 'Crawl rules are being re-applied in the background',
            }
          )
        );

        CrawlerLogic.actions.fetchCrawlerData();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    startCrawl: async ({ overrides = {} }) => {
      const { indexName } = IndexNameLogic.values;
      const { http } = HttpLogic.values;

      try {
        await http.post(`/internal/enterprise_search/indices/${indexName}/crawler/crawl_requests`, {
          body: JSON.stringify({ overrides }),
        });
        actions.fetchCrawlerData();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    stopCrawl: async () => {
      const { indexName } = IndexNameLogic.values;
      const { http } = HttpLogic.values;

      try {
        await http.post(
          `/internal/enterprise_search/indices/${indexName}/crawler/crawl_requests/cancel`
        );
        actions.fetchCrawlerData();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
  path: ['enterprise_search', 'crawler_logic'],
  reducers: {
    dataLoading: [
      true,
      {
        apiError: () => false,
        apiSuccess: () => false,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    domains: [() => [selectors.data], (data: CrawlerValues['data']) => data?.domains ?? []],
    events: [() => [selectors.data], (data: CrawlerValues['data']) => data?.events ?? []],
    mostRecentCrawlRequest: [
      () => [selectors.data],
      (data: CrawlerValues['data']) => data?.mostRecentCrawlRequest ?? null,
    ],
    mostRecentCrawlRequestStatus: [
      () => [selectors.mostRecentCrawlRequest],
      (crawlRequest: CrawlerValues['mostRecentCrawlRequest']) => crawlRequest?.status ?? null,
    ],
  }),
});
