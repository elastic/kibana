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

const POLLING_DURATION = 1000;
const POLLING_DURATION_ON_FAILURE = 5000;
const ACTIVE_STATUSES = [
  CrawlerStatus.Pending,
  CrawlerStatus.Starting,
  CrawlerStatus.Running,
  CrawlerStatus.Canceling,
];

export interface CrawlRequestOverrides {
  domain_allowlist?: string[];
  max_crawl_depth?: number;
  seed_urls?: string[];
  sitemap_discovery_disabled?: boolean;
  sitemap_urls?: string[];
}

export interface CrawlerValues {
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
  clearTimeoutId(): void;
  createNewTimeoutForCrawlerData(duration: number): { duration: number };
  fetchCrawlerData(): void;
  onCreateNewTimeout(timeoutId: NodeJS.Timeout): { timeoutId: NodeJS.Timeout };
  reApplyCrawlRules(domain?: CrawlerDomain): { domain?: CrawlerDomain };
  startCrawl(overrides?: CrawlRequestOverrides): { overrides?: CrawlRequestOverrides };
  stopCrawl(): void;
};

export const CrawlerLogic = kea<MakeLogicType<CrawlerValues, CrawlerActions>>({
  path: ['enterprise_search', 'crawler_logic'],
  connect: {
    actions: [GetCrawlerApiLogic, ['apiError', 'apiSuccess']],
    values: [GetCrawlerApiLogic, ['status']],
  },
  actions: {
    clearTimeoutId: true,
    createNewTimeoutForCrawlerData: (duration) => ({ duration }),
    fetchCrawlerData: true,
    onCreateNewTimeout: (timeoutId) => ({ timeoutId }),
    reApplyCrawlRules: (domain) => ({ domain }),
    startCrawl: (overrides) => ({ overrides }),
    stopCrawl: () => null,
  },
  reducers: {
    dataLoading: [
      true,
      {
        apiError: () => false,
        apiSuccess: () => false,
      },
    ],
    domains: [
      [],
      {
        apiSuccess: (_, { domains }) => domains,
      },
    ],
    events: [
      [],
      {
        apiSuccess: (_, { events }) => events,
      },
    ],
    mostRecentCrawlRequest: [
      null,
      {
        apiSuccess: (_, { mostRecentCrawlRequest }) => mostRecentCrawlRequest,
      },
    ],
    timeoutId: [
      null,
      {
        apiError: () => null,
        apiSuccess: () => null,
        onCreateNewTimeout: (_, { timeoutId }) => timeoutId,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    mostRecentCrawlRequestStatus: [
      () => [selectors.mostRecentCrawlRequest],
      (crawlRequest: CrawlerValues['mostRecentCrawlRequest']) => {
        if (crawlRequest) {
          return crawlRequest.status;
        }
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    apiError: (error) => {
      flashAPIErrors(error);
      actions.createNewTimeoutForCrawlerData(POLLING_DURATION_ON_FAILURE);
    },
    apiSuccess: ({ mostRecentCrawlRequest }) => {
      const continuePoll =
        mostRecentCrawlRequest && ACTIVE_STATUSES.includes(mostRecentCrawlRequest.status); // || crawlerData.events.find((event) => ACTIVE_STATUSES.includes(event.status));

      if (continuePoll) {
        actions.createNewTimeoutForCrawlerData(POLLING_DURATION);
      }
    },
    fetchCrawlerData: () => {
      const { indexName } = IndexNameLogic.values;

      if (values.timeoutId) {
        clearTimeout(values.timeoutId);
      }
      GetCrawlerApiLogic.actions.makeRequest({ indexName });
    },
    startCrawl: async ({ overrides = {} }) => {
      const { indexName } = IndexNameLogic.values;
      const { http } = HttpLogic.values;

      try {
        await http.post(`/internal/ent_search/indices/${indexName}/crawler/crawl_requests`, {
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
        await http.post(`/internal/ent_search/indices/${indexName}/crawler/crawl_requests/cancel`);
        actions.fetchCrawlerData();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    createNewTimeoutForCrawlerData: ({ duration }) => {
      if (values.timeoutId) {
        clearTimeout(values.timeoutId);
      }

      const timeoutIdId = setTimeout(() => {
        actions.fetchCrawlerData();
      }, duration);

      actions.onCreateNewTimeout(timeoutIdId);
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
  }),
  events: ({ actions, values }) => ({
    afterMount: () => {
      actions.fetchCrawlerData();
    },
    beforeUnmount: () => {
      if (values.timeoutId) {
        clearTimeout(values.timeoutId);
      }
    },
  }),
});
