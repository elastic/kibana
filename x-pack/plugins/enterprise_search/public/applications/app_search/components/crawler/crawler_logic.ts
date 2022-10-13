/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../shared/flash_messages';

import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';

import { CrawlerDomainsLogic } from './crawler_domains_logic';

import {
  CrawlerData,
  CrawlerDomain,
  CrawlEvent,
  CrawlRequest,
  CrawlerStatus,
  CrawlerDataFromServer,
} from './types';
import { crawlerDataServerToClient } from './utils';

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
  sitemap_urls?: string[];
  sitemap_discovery_disabled?: boolean;
}

export interface CrawlerValues {
  events: CrawlEvent[];
  dataLoading: boolean;
  domains: CrawlerDomain[];
  mostRecentCrawlRequest: CrawlRequest | null;
  mostRecentCrawlRequestStatus: CrawlerStatus | null;
  timeoutId: NodeJS.Timeout | null;
}

interface CrawlerActions {
  clearTimeoutId(): void;
  createNewTimeoutForCrawlerData(duration: number): { duration: number };
  fetchCrawlerData(): void;
  onCreateNewTimeout(timeoutId: NodeJS.Timeout): { timeoutId: NodeJS.Timeout };
  onReceiveCrawlerData(data: CrawlerData): { data: CrawlerData };
  onStartCrawlRequestComplete(): void;
  startCrawl(overrides?: CrawlRequestOverrides): { overrides?: CrawlRequestOverrides };
  stopCrawl(): void;
}

export const CrawlerLogic = kea<MakeLogicType<CrawlerValues, CrawlerActions>>({
  path: ['enterprise_search', 'app_search', 'crawler_logic'],
  actions: {
    clearTimeoutId: true,
    createNewTimeoutForCrawlerData: (duration) => ({ duration }),
    fetchCrawlerData: true,
    onCreateNewTimeout: (timeoutId) => ({ timeoutId }),
    onReceiveCrawlerData: (data) => ({ data }),
    onStartCrawlRequestComplete: true,
    startCrawl: (overrides) => ({ overrides }),
    stopCrawl: () => null,
  },
  reducers: {
    dataLoading: [
      true,
      {
        onReceiveCrawlerData: () => false,
      },
    ],
    domains: [
      [],
      {
        onReceiveCrawlerData: (_, { data: { domains } }) => domains,
      },
    ],
    events: [
      [],
      {
        onReceiveCrawlerData: (_, { data: { events } }) => events,
      },
    ],
    mostRecentCrawlRequest: [
      null,
      {
        onReceiveCrawlerData: (_, { data: { mostRecentCrawlRequest } }) => mostRecentCrawlRequest,
      },
    ],
    timeoutId: [
      null,
      {
        clearTimeoutId: () => null,
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
        return CrawlerStatus.Success;
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    fetchCrawlerData: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get<CrawlerDataFromServer>(
          `/internal/app_search/engines/${engineName}/crawler`
        );

        const crawlerData = crawlerDataServerToClient(response);
        actions.onReceiveCrawlerData(crawlerData);

        const continuePoll =
          (crawlerData.mostRecentCrawlRequest &&
            ACTIVE_STATUSES.includes(crawlerData.mostRecentCrawlRequest.status)) ||
          crawlerData.events.find((event) => ACTIVE_STATUSES.includes(event.status));

        if (continuePoll) {
          actions.createNewTimeoutForCrawlerData(POLLING_DURATION);
        } else {
          actions.clearTimeoutId();
        }
      } catch (e) {
        flashAPIErrors(e);
        actions.createNewTimeoutForCrawlerData(POLLING_DURATION_ON_FAILURE);
      }
    },
    startCrawl: async ({ overrides = {} }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        await http.post(`/internal/app_search/engines/${engineName}/crawler/crawl_requests`, {
          body: JSON.stringify({ overrides }),
        });
        actions.fetchCrawlerData();
      } catch (e) {
        flashAPIErrors(e);
      } finally {
        actions.onStartCrawlRequestComplete();
      }
    },
    stopCrawl: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        await http.post(`/internal/app_search/engines/${engineName}/crawler/crawl_requests/cancel`);
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
    [CrawlerDomainsLogic.actionTypes.crawlerDomainDeleted]: ({ data }) => {
      actions.onReceiveCrawlerData(data);
    },
  }),
  events: ({ values }) => ({
    beforeUnmount: () => {
      if (values.timeoutId) {
        clearTimeout(values.timeoutId);
      }
    },
  }),
});
